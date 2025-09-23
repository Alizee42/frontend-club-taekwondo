import { Component, OnInit, TrackByFunction } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';


type Statut = 'payé' | 'en attente' | 'en retard' | 'annulé';

export interface Echeance {
  id?: number;
  numero?: number;
  dateEcheance?: string | Date;
  montant: number;
  statut?: Statut | string;
  modePaiement?: 'stripe' | 'virement' | 'espèces' | string;
}

export interface Paiement {
  id: number;
  datePaiement?: string | Date;
  utilisateurId?: number;          // ← utile si dispo côté API
  utilisateurNom?: string;
  utilisateurPrenom?: string;
  utilisateurEmail?: string;

  membreNom?: string;
  membrePrenom?: string;

  type?: 'unique' | 'échelonné' | string; // peut être ECHELONNE / UNIQUE côté back
  modePaiement?: 'stripe' | 'virement' | 'espèces' | string; // peut être CB / VIREMENT / ...

  montantTotal: number;
  statut?: Statut | string;

  echeances?: Echeance[];
}

interface GroupeParent {
  id: number;
  nom: string;
  prenom: string;
  email?: string;
  enfants: string[];
  paiements: Paiement[];
  total: number;
  paye: number;
  restant: number;
  statut: Statut | string;
}

@Component({
  selector: 'app-suivi-paiements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './suivi-paiements.component.html',
  styleUrls: ['./suivi-paiements.component.css']
})
export class SuiviPaiementsComponent implements OnInit {
  private readonly API_BASE = environment.apiUrl;

  // --- State général
  loading = false;
  error = '';

  // Vue active
  mode: 'paiements' | 'utilisateurs' = 'paiements';

  // Données
  paiements: Paiement[] = [];
  paiementsFiltres: Paiement[] = [];

  // Vue groupée
  groupByParent = false;
  paiementsGroupes: GroupeParent[] = [];

  // Vue utilisateurs (onglet 2)
  utilisateursFiltres: GroupeParent[] = [];

  // Filtres
  filtres = { q: '', statut: '', type: '', mode: '' };
  searchUsers = '';

  // Modales (paiement)
  modalEcheancesVisible = false;
  modalAnnulationVisible = false;
  paiementActuel: Paiement | null = null;
  motifAnnulation = '';

  // Modales (utilisateur)
  modalUserStatsVisible = false;
  modalUserEcheancesVisible = false;
  utilisateurSelectionne: GroupeParent | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.refresh();
  }

  /* =======================
   *        API
   * ======================= */

  refresh(): void {
    this.loading = true;
    this.error = '';

    const token = localStorage.getItem('token') || '';

    this.http.get<Paiement[]>(`${this.API_BASE}/paiements`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }).subscribe({
      next: (res) => {
        this.paiements = Array.isArray(res) ? res : [];

        // Normaliser les dates
        this.paiements.forEach(p => {
          p.datePaiement = p.datePaiement ? new Date(p.datePaiement) : undefined;
          (p.echeances || []).forEach(e => {
            e.dateEcheance = e.dateEcheance ? new Date(e.dateEcheance) : undefined;
          });
        });

        this.applyFilters(); // fera aussi buildGroups() + buildUsersView()
        this.loading = false;
      },
      error: (err) => {
        console.error('[Suivi] refresh error', err);
        this.error = 'Impossible de charger les paiements.';
        this.loading = false;
      }
    });
  }

  /* =======================
   *        Helpers
   * ======================= */

  private sansAccents(s?: string): string {
    return (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  }

  /** Type lisible : gère ECHELONNE/ECHEANCES/UNIQUE/COTISATION + déduction si type manquant */
  libelleType(t?: string, ech?: { id?: number }[] | undefined): string {
    const v = this.sansAccents(t);
    if (v.includes('echelon') || v.includes('echeanc')) return 'Échelonné';
    if (v.includes('unique')) return 'Unique';
    if (v.includes('cotisation')) return 'Unique'; // même comportement qu'un unique

    // Si le back n'a pas renseigné le type : on déduit
    if (Array.isArray(ech) && ech.length > 0) return 'Échelonné';
    return 'Unique';
  }

  /** Mode lisible (et ignore un type mal rangé en "mode") */
  libelleMode(m?: string): string {
    const v = this.sansAccents(m);
    if (!v) return '—';
    if (v.includes('echeanc')) return '—';
    if (v === 'cb' || v.includes('carte') || v.includes('stripe')) return 'CB';
    if (v.includes('virement')) return 'Virement';
    if (v.includes('espece')) return 'Espèces';
    if (v.includes('cheque')) return 'Chèque';
    return '—';
  }

  /** Badge CSS par statut (insensible aux accents/majuscules) */
  classeBadge(statut?: string): string {
    const s = this.sansAccents(statut);
    if (s === 'paye') return 'badge badge-success';
    if (s === 'annule') return 'badge badge-secondary';
    if (s.includes('retard')) return 'badge badge-danger';
    if (s.includes('attente')) return 'badge badge-warning';
    return 'badge badge-dark';
  }

  /* =======================
   *     Helpers calcul
   * ======================= */

  montantPaye(p: Paiement): number {
    const total = p.montantTotal || 0;

    // Échelonné : somme des échéances payées
    if (Array.isArray(p.echeances) && p.echeances.length) {
      return p.echeances.reduce((s, e) => {
        const st = this.sansAccents(e.statut);
        const m = e.montant || 0;
        return st === 'paye' ? s + m : s;
      }, 0);
    }

    // Paiement unique : tout payé si statut payé, sinon 0
    const st = this.sansAccents(p.statut);
    return st === 'paye' ? total : 0;
  }

  montantRestant(p: Paiement): number {
    const restant = (p.montantTotal || 0) - this.montantPaye(p);
    return Math.max(0, Number.isFinite(restant) ? restant : 0);
  }

  montantParEcheance(p: Paiement): number {
    const typeLisible = this.libelleType(p.type, p.echeances); // 'Échelonné' | 'Unique'
    if (typeLisible !== 'Échelonné') return 0;
    const ech = p.echeances || [];
    if (ech.length > 0) return ech[0].montant || 0;
    const n = (p as any).nombreEcheances || 0;
    return n > 0 && p.montantTotal ? p.montantTotal / n : 0;
  }

  /* =======================
   *   Filtres & Groupes
   * ======================= */

  applyFilters(): void {
    const q = (this.filtres.q || '').trim().toLowerCase();
    const statutF = this.sansAccents(this.filtres.statut);
    const typeF = this.sansAccents(this.filtres.type); // 'unique' | 'echelon'
    const modeF = this.sansAccents(this.filtres.mode); // 'stripe' | 'virement' | 'especes' | 'cheque'

    this.paiementsFiltres = this.paiements.filter(p => {
      const hay = `${p.utilisateurNom || ''} ${p.utilisateurPrenom || ''} ${p.utilisateurEmail || ''} ${p.membreNom || ''} ${p.membrePrenom || ''}`.toLowerCase();

      // Canoniser via libellés robustes
      const typeLisible = this.libelleType(p.type, p.echeances); // 'Échelonné' | 'Unique'
      const modeLisible = this.libelleMode(p.modePaiement);      // 'CB (Stripe)' | 'Virement' | 'Espèces' | ...

      const typeCanon = this.sansAccents(typeLisible);           // 'echelonne' | 'unique'
      const modeCanon = this.sansAccents(modeLisible);           // 'cb (stripe)' | 'virement' | ...

      const statutCanon = this.sansAccents(p.statut);

      const okQ      = !q || hay.includes(q);
      const okStatut = !statutF || statutCanon === statutF;
      const okType   = !typeF || typeCanon.includes(typeF);      // accepte 'echelon'
      const okMode   = !modeF || modeCanon.includes(modeF);

      return okQ && okStatut && okType && okMode;
    });

    // Tri : date desc puis id desc
    this.paiementsFiltres.sort((a, b) => {
      const da = a.datePaiement ? new Date(a.datePaiement).getTime() : 0;
      const db = b.datePaiement ? new Date(b.datePaiement).getTime() : 0;
      if (db !== da) return db - da;
      return (b.id || 0) - (a.id || 0);
    });

    // Recalcule la vue groupée & utilisateurs après filtrage
    this.buildGroups();
    this.buildUsersView();
  }

  resetFilters(): void {
    this.filtres = { q: '', statut: '', type: '', mode: '' };
    this.applyFilters();
  }

  // ⚠️ Publique (appelée par l’UI possible)
  buildGroups(): void {
    const map = new Map<number, GroupeParent>();

    for (const p of this.paiementsFiltres) {
      const key = p.utilisateurId ?? this.hashUserKey(p);
      const nom = p.utilisateurNom || '';
      const prenom = p.utilisateurPrenom || '';
      const email = p.utilisateurEmail || '';

      const enfant = `${p.membrePrenom || ''} ${p.membreNom || ''}`.trim();

      if (!map.has(key)) {
        map.set(key, {
          id: key, nom, prenom, email,
          enfants: enfant ? [enfant] : [],
          paiements: [],
          total: 0, paye: 0, restant: 0,
          statut: 'en attente'
        });
      }
      const g = map.get(key)!;
      g.paiements.push(p);
      if (enfant && !g.enfants.includes(enfant)) g.enfants.push(enfant);
    }

    // Calculs agrégés + statut global
    this.paiementsGroupes = Array.from(map.values()).map(g => {
      g.total = g.paiements.reduce((s, p) => s + (p.montantTotal || 0), 0);
      g.paye = g.paiements.reduce((s, p) => s + this.montantPaye(p), 0);
      g.restant = Math.max(0, g.total - g.paye);

      const tousPayes = g.paiements.every(p => this.sansAccents(p.statut) === 'paye');
      const aDuRetard = g.paiements.some(p => this.sansAccents(p.statut).includes('retard'));
      g.statut = (tousPayes ? 'payé' : (aDuRetard ? 'en retard' : 'en attente'));

      return g;
    });
  }

  private buildUsersView(): void {
    const q = (this.searchUsers || '').toLowerCase();

    this.utilisateursFiltres = this.paiementsGroupes.filter(g => {
      if (!q) return true;
      const hay = `${g.nom} ${g.prenom} ${g.email} ${(g.enfants || []).join(' ')}`.toLowerCase();
      return hay.includes(q);
    });
  }

  filtrerUtilisateurs(): void {
    this.buildUsersView();
  }

  private hashUserKey(p: Paiement): number {
    const base = `${p.utilisateurNom || ''}|${p.utilisateurPrenom || ''}|${p.utilisateurEmail || ''}`;
    let h = 0;
    for (let i = 0; i < base.length; i++) h = (h << 5) - h + base.charCodeAt(i);
    return Math.abs(h);
  }

  /* =======================
   *        Modales
   * ======================= */

  ouvrirEcheances(p: Paiement): void {
    this.paiementActuel = p;
    this.modalEcheancesVisible = true;
  }
  fermerEcheances(): void {
    this.modalEcheancesVisible = false;
    this.paiementActuel = null;
  }

  ouvrirAnnulation(p: Paiement): void {
    this.paiementActuel = p;
    this.motifAnnulation = '';
    this.modalAnnulationVisible = true;
  }
  fermerAnnulation(): void {
    this.modalAnnulationVisible = false;
    this.paiementActuel = null;
  }

  userVoirStats(g: GroupeParent): void {
    this.utilisateurSelectionne = g;
    this.modalUserStatsVisible = true;
    this.modalUserEcheancesVisible = false;
  }
  userVoirEcheances(g: GroupeParent): void {
    this.utilisateurSelectionne = g;
    this.modalUserStatsVisible = false;
    this.modalUserEcheancesVisible = true;
  }
  userFermerModales(): void {
    this.utilisateurSelectionne = null;
    this.modalUserStatsVisible = false;
    this.modalUserEcheancesVisible = false;
  }

  /* =======================
   *     Actions admin
   * ======================= */

  // Le paiement est "payable" s'il n'est pas annulé/payé et qu'il reste > 0
  estPayable(p: Paiement): boolean {
    const s = this.sansAccents(p.statut);
    return s !== 'annule' && s !== 'paye' && this.montantRestant(p) > 0;
  }

  marquerPaiementPaye(p: Paiement): void {
    if (!p?.id) return;
    if (!confirm('Confirmer : marquer ce paiement comme entièrement payé ?')) return;

    const token = localStorage.getItem('token') || '';

    this.http.post(`${this.API_BASE}/paiements/${p.id}/valider`, {}, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }).subscribe({
      next: () => {
        // MAJ locale : statut paiement + échéances
        p.statut = 'payé';
        if (Array.isArray(p.echeances)) {
          p.echeances = p.echeances.map(e => ({ ...e, statut: 'payé' as Statut }));
        }
        this.applyFilters(); // rebuildGroups + users inclus
        this.modalEcheancesVisible = false;
      },
      error: (err) => {
        console.error('[Suivi] marquerPaiementPaye error', err);
        alert('Impossible de marquer le paiement comme payé.');
      }
    });
  }

  marquerEcheancePayee(p: Paiement, e: Echeance): void {
    if (!p?.id || !e?.id) return;

    const token = localStorage.getItem('token') || '';
    const body = [{ id: e.id }];

    this.http.post(`${this.API_BASE}/paiements/${p.id}/payer-echeance`, body, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }).subscribe({
      next: () => {
        // MAJ locale
        e.statut = 'payé';

        // Recalcul du statut global
        const restant = this.montantRestant(p);
        if (restant <= 0) {
          p.statut = 'payé';
        } else {
          const aDuRetard = (p.echeances || []).some(x => {
            const st = this.sansAccents(x.statut);
            return st !== 'paye' && x.dateEcheance && new Date(x.dateEcheance) < new Date();
          });
          p.statut = aDuRetard ? 'en retard' : 'en attente';
        }

        this.applyFilters(); // rebuildGroups + users inclus
      },
      error: (err) => {
        console.error('[Suivi] marquerEcheancePayee error', err);
        alert('Impossible de marquer l’échéance comme payée.');
      }
    });
  }

  confirmerAnnulation(): void {
    if (!this.paiementActuel?.id) return;

    const token = localStorage.getItem('token') || '';

    // LocalDateTime attendu par beaucoup de back Java : "YYYY-MM-DDTHH:mm:ss" (sans Z)
    const isoLocal = new Date().toISOString().slice(0, 19);

    const body = {
      motif: this.motifAnnulation || 'Annulation par admin',
      dateAnnulation: isoLocal,
      adminResponsable: this.utilisateurSelectionne?.email || 'admin'
    };

    this.http.put(`${this.API_BASE}/paiements/${this.paiementActuel.id}/annuler`, body, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }).subscribe({
      next: (updated: any) => {
        if (updated?.id) {
          const idx = this.paiements.findIndex(x => x.id === updated.id);
          if (idx > -1) this.paiements[idx] = { ...this.paiements[idx], ...updated };
        } else {
          this.paiementActuel!.statut = 'annulé';
        }
        this.applyFilters(); // rebuildGroups + users inclus
        this.fermerAnnulation();
      },
      error: (err) => {
        console.error('[Suivi] confirmerAnnulation error', err);
        alert('Impossible d’annuler le paiement.');
      }
    });
  }

  /* =======================
   *       TrackBy
   * ======================= */

  trackByPaiement: TrackByFunction<Paiement> = (_, p) => p.id;
  trackByEcheance: TrackByFunction<Echeance> = (_, e) => e.id ?? e.numero ?? 0;
  trackByUtilisateur: TrackByFunction<GroupeParent> = (_, u) => u.id;
}
