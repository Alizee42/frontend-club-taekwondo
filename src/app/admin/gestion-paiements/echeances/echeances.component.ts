import { Component, OnInit, TrackByFunction } from '@angular/core';
import { CommonModule, NgIf, NgFor, DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EcheancesService, Echeance as ApiEcheance } from '../../../services/echeances.service';

type ModeVue = 'echeances' | 'utilisateurs';

interface Echeance {
  id?: number;
  numero?: number;
  dateEcheance: string | Date;
  montant: number;
  statut: string;
  enfantPrenom?: string;
  enfantNom?: string;
}

interface MembreEcheances {
  id: string; // clé "prenom|nom"
  prenom: string;
  nom: string;
  email?: string;
  echeances: Echeance[];
  expanded?: boolean;
}

interface ResumeUtilisateur {
  id: string;
  prenom: string;
  nom: string;
  email?: string;
  enfants: string[];
  total: number;
  paye: number;
  attente: number;
  retard: number;
  annule: number;
  restant: number;
}

@Component({
  selector: 'app-echeances',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIf, NgFor, DatePipe, CurrencyPipe],
  templateUrl: './echeances.component.html',
  styleUrls: ['./echeances.component.css']
})
export class EcheancesComponent implements OnInit {
  // Données
  membres: MembreEcheances[] = [];
  membresFiltres: MembreEcheances[] = [];
  utilisateursResume: ResumeUtilisateur[] = [];

  // État
  loading = false;
  error: string | null = null;

  // Filtres
  filtreTexte = '';
  filtreStatut: '' | 'payé' | 'en attente' | 'en retard' | 'annulé' = '';
  filtrePeriode: '' | 'a-venir' | 'aujourdhui' | 'en-retard' = '';

  // Résumé global
  totaux = { total: 0, paye: 0, attente: 0, retard: 0, annule: 0, montantRestant: 0 };

  // Vue
  mode: ModeVue = 'echeances';

  constructor(private api: EcheancesService) {}

  ngOnInit(): void { this.loadData(); }

  /* ===== Utils ===== */
  private norm(v: any): string {
    return (v ?? '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
  }

  classeBadge(statut: any): string {
    const s = this.norm(statut);
    if (['paye','payee','payé','payée','regle','reglee','réglé','réglée'].includes(s)) return 'badge badge-success';
    if (['en attente','attente','pending'].includes(s)) return 'badge badge-warning';
    if (['en retard','retard','late','overdue'].includes(s)) return 'badge badge-dark';
    if (['annule','annulee','annulé','annulée','cancelled'].includes(s)) return 'badge badge-danger';
    return 'badge badge-secondary';
  }

  isEnRetard(statut: any): boolean {
    const s = this.norm(statut);
    return ['en retard','retard','late','overdue'].includes(s);
  }

  private normalizeStatut(statut: string): 'payé'|'en attente'|'en retard'|'annulé' {
    const s = this.norm(statut);
    if (s.includes('paye') || s.includes('regle')) return 'payé';
    if (s.includes('attent') || s === 'pending') return 'en attente';
    if (s.includes('retard') || s === 'late' || s === 'overdue') return 'en retard';
    if (s.includes('annul') || s === 'cancelled') return 'annulé';
    return 'en attente';
  }

  displayEnfant(e: Echeance): string {
    const p = (e.enfantPrenom || '').trim();
    const n = (e.enfantNom || '').trim();
    return (p || n) ? `${p} ${n}`.trim() : '—';
  }

  private uniq<T>(arr: T[]): T[] { return Array.from(new Set(arr.filter(Boolean))); }

  private buildUtilisateursResume(source: MembreEcheances[]): void {
    const out: ResumeUtilisateur[] = [];
    for (const m of source) {
      const flat = m.echeances || [];
      const paye    = flat.filter(e => this.norm(e.statut) === 'paye').length;
      const attente = flat.filter(e => this.norm(e.statut) === 'en attente').length;
      const retard  = flat.filter(e => this.norm(e.statut) === 'en retard').length;
      const annule  = flat.filter(e => this.norm(e.statut) === 'annule').length;
      const restant = flat.filter(e => !/^(paye|annule)$/.test(this.norm(e.statut)))
                        .reduce((s,e)=> s + (e.montant||0), 0);

      const enfants = this.uniq(flat
        .map(e => `${(e.enfantPrenom||'').trim()} ${(e.enfantNom||'').trim()}`.trim())
        .filter(v => !!v && v !== '—'));

      out.push({ id: m.id, prenom: m.prenom, nom: m.nom, email: m.email,
                 enfants, total: flat.length, paye, attente, retard, annule, restant });
    }
    this.utilisateursResume = out;
  }

  statutGlobalUser(u: ResumeUtilisateur): 'payé'|'en attente'|'en retard'|'annulé' {
    if (u.restant <= 0 && u.total > 0) return 'payé';
    if (u.retard > 0) return 'en retard';
    if (u.attente > 0) return 'en attente';
    if (u.annule === u.total && u.total > 0) return 'annulé';
    return 'en attente';
  }

  /* ===== Data ===== */
  private loadData(): void {
    this.loading = true; this.error = null;
    this.api.getAllEcheances().subscribe({
      next: (rows) => {
        this.membres = this.mapFlatToMembres(rows);
        this.applyFilters();
      },
      error: () => this.error = 'Erreur lors du chargement des échéances',
      complete: () => (this.loading = false)
    });
  }

  private mapFlatToMembres(data: ApiEcheance[]): MembreEcheances[] {
    const buckets = new Map<string, MembreEcheances>();
    for (const r of data || []) {
      const parentPrenom = (r as any).prenom ?? '';
      const parentNom    = (r as any).nom ?? '';
      const key = `${parentPrenom}|${parentNom}`;
      if (!buckets.has(key)) {
        buckets.set(key, { id: key, prenom: parentPrenom, nom: parentNom, email: (r as any).email ?? undefined, echeances: [] });
      }
      buckets.get(key)!.echeances.push({
        id: (r as any).id,
        numero: (r as any).numero,
        dateEcheance: (r as any).dateEcheance,
        montant: (r as any).montant,
        statut: this.normalizeStatut((r as any).statut ?? ''),
        enfantPrenom: (r as any).enfantPrenom || '',
        enfantNom:    (r as any).enfantNom || ''
      });
    }
    return Array.from(buckets.values());
  }

  /* ===== Filtres ===== */
  trackByMembre: TrackByFunction<MembreEcheances> = (_: number, m: MembreEcheances) => m.id;
  trackByEcheance: TrackByFunction<Echeance> = (_: number, e: Echeance) => e.id ?? `${e.dateEcheance}-${e.montant}`;
  trackByUser: TrackByFunction<ResumeUtilisateur> = (_: number, u: ResumeUtilisateur) => u.id;

  countByStatut(m: MembreEcheances, statut: 'payé'|'en attente'|'en retard'|'annulé'): number {
    const tgt = this.norm(statut);
    return m.echeances?.filter(e => this.norm(e.statut) === tgt).length || 0;
  }

  montantRestantMembre(m: MembreEcheances): number {
    return (m.echeances || [])
      .filter(e => !/^(paye|annule)$/.test(this.norm(e.statut)))
      .reduce((sum,e) => sum + (e.montant || 0), 0);
  }

  toggleAll(expand: boolean): void { this.membresFiltres.forEach(m => m.expanded = expand); }

  resetFilters(): void { this.filtreTexte = ''; this.filtreStatut = ''; this.filtrePeriode = ''; this.applyFilters(); }

  applyFilters(): void {
    const txt = this.norm(this.filtreTexte);
    const statut = this.norm(this.filtreStatut);
    const periode = this.filtrePeriode;

    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const withinPeriode = (e: Echeance): boolean => {
      if (!periode) return true;
      const d = new Date(e.dateEcheance);
      const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const closed = /^(paye|annule)$/.test(this.norm(e.statut));
      if (periode === 'aujourdhui') return dStart.getTime() === startOfToday.getTime();
      if (periode === 'a-venir')    return dStart.getTime() >  startOfToday.getTime();
      if (periode === 'en-retard')  return dStart.getTime() <  startOfToday.getTime() && !closed;
      return true;
    };

    const out: MembreEcheances[] = [];
    for (const m of this.membres) {
      const matchMembre = !txt || this.norm(`${m.prenom} ${m.nom}`).includes(txt) || this.norm(m.email).includes(txt);
      const ech = (m.echeances || []).filter(e => {
        const statOk = !statut || this.norm(e.statut) === statut;
        const perOk  = withinPeriode(e);
        const textOk = !txt ||
          this.norm(String(e.numero ?? '')).includes(txt) ||
          String(e.montant ?? '').includes(txt) ||
          this.norm(`${e.enfantPrenom || ''} ${e.enfantNom || ''}`).includes(txt);
        return statOk && perOk && (matchMembre || textOk);
      });
      if (ech.length) out.push({ ...m, echeances: ech, expanded: m.expanded });
    }

    this.membresFiltres = out;

    const flat = out.flatMap(m => m.echeances);
    this.totaux.total   = flat.length;
    this.totaux.paye    = flat.filter(e => this.norm(e.statut) === 'paye').length;
    this.totaux.attente = flat.filter(e => this.norm(e.statut) === 'en attente').length;
    this.totaux.retard  = flat.filter(e => this.norm(e.statut) === 'en retard').length;
    this.totaux.annule  = flat.filter(e => this.norm(e.statut) === 'annule').length;
    this.totaux.montantRestant = flat.filter(e => !/^(paye|annule)$/.test(this.norm(e.statut)))
                                  .reduce((s,e)=> s + (e.montant||0), 0);

    // construit la vue “Par utilisateur”
    this.buildUtilisateursResume(this.membresFiltres);
  }

  /* ===== Actions ===== */
  marquerCommePayee(e: Echeance): void { e.statut = 'payé'; this.applyFilters(); }

  supprimerEcheance(e: Echeance): void {
    for (const m of this.membres) {
      const i = m.echeances.indexOf(e);
      if (i > -1) { m.echeances.splice(i, 1); break; }
    }
    this.applyFilters();
  }

  relancerEcheance(e: Echeance): void {
  }
}
