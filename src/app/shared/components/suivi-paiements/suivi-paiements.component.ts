import { Component, OnInit, TrackByFunction, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Club } from '../../../services/club.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AjoutPaiementComponent } from '../../../admin/gestion-paiements/ajout-paiement/ajout-paiement.component';
import { EcheanceComponent } from '../echeance/echeance.component';
import { UiButtonComponent } from '../../ui/buttons/ui-button/ui-button.component';
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
  utilisateurId?: number;
  utilisateurNom?: string;
  utilisateurPrenom?: string;
  utilisateurEmail?: string;
  clubId?: number;
  club?: string;
  clubNom?: string;
  clubName?: string;
  membreNom?: string;
  membrePrenom?: string;
  type?: 'unique' | 'échelonné' | string;
  modePaiement?: 'stripe' | 'virement' | 'espèces' | string;
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
  imports: [CommonModule, FormsModule, AjoutPaiementComponent, EcheanceComponent, UiButtonComponent],
  templateUrl: './suivi-paiements.component.html',
  styleUrls: ['./suivi-paiements.component.css']
})
export class SuiviPaiementsComponent implements OnInit, OnChanges {
  @Input() clubFilter: number | 'all' = 'all';
  @Input() paiementsData?: Paiement[];
  @Input() clubs?: Club[];
  @Input() viewMode?: 'paiements' | 'utilisateurs';
  @Input() showTitle: boolean = true;
  @Input() showToolbar: boolean = true;
  @Input() externalQuery?: string | null = null;
  @Input() showFilters: boolean = true;
  @Input() externalFilters?: { statut?: string; type?: string; mode?: string } | null = null;
  @Input() externalGroupByParent?: boolean | null = null;

  private readonly API_BASE = environment.apiUrl;
  loading = false;
  error = '';
  mode: 'paiements' | 'utilisateurs' = 'paiements';
  paiements: Paiement[] = [];
  paiementsFiltres: Paiement[] = [];
  groupByParent = false;
  paiementsGroupes: GroupeParent[] = [];
  utilisateursFiltres: GroupeParent[] = [];
  filtres = { q: '', statut: '', type: '', mode: '' };
  // alias english-friendly used by template
  get filters() { return this.filtres; }
  set filters(v: any) { this.filtres = v; }
  searchUsers = '';
  modalEcheancesVisible = false;
  modalAnnulationVisible = false;
  paiementActuel: Paiement | null = null;
  motifAnnulation = '';
  annulationError = '';
  annulationLoading = false;
  modalAjoutPaiementVisible = false;

  ouvrirAjoutPaiement(): void { this.modalAjoutPaiementVisible = true; }
  fermerAjoutPaiement(): void { this.modalAjoutPaiementVisible = false; }
  onPaiementCree(event?: any): void { this.fermerAjoutPaiement(); this.refresh(); }

  modalUserStatsVisible = false;
  modalUserEcheancesVisible = false;
  utilisateurSelectionne: GroupeParent | null = null;
  // Utilisateurs expansés pour la vue 'par utilisateur' (accordion inline)
  expandedUsers: Set<number> = new Set<number>();
  // If true for a user, the expanded section shows fully (no internal scroll)
  expandedFullUsers: Set<number> = new Set<number>();

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    if (Array.isArray(this.paiementsData) && this.paiementsData.length) {
      this.paiements = this.paiementsData;
      this.applyFilters();
    } else {
      this.refresh();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['paiementsData'] && Array.isArray(this.paiementsData)) {
      // Normalize incoming paiement dates so modals/calculs fonctionnent correctement
      this.paiements = (this.paiementsData || []).map(p => {
        const copy: Paiement = { ...p } as any;
        copy.datePaiement = copy.datePaiement ? new Date(copy.datePaiement) : undefined;
        if (Array.isArray(copy.echeances)) {
          copy.echeances = copy.echeances.map(e => ({ ...e, dateEcheance: e.dateEcheance ? new Date(e.dateEcheance) : undefined }));
        }
        return copy;
      });
      this.applyFilters();
    }
    if (changes['clubFilter'] && !changes['paiementsData']) this.applyFilters();
    if (changes['viewMode'] && this.viewMode) this.mode = this.viewMode as any;
    if (changes['externalQuery'] && typeof this.externalQuery === 'string') {
      this.filtres.q = this.externalQuery || '';
      this.applyFilters();
    }
    if (changes['externalFilters'] && this.externalFilters) {
      this.filtres.statut = this.externalFilters.statut || '';
      this.filtres.type = this.externalFilters.type || '';
      this.filtres.mode = this.externalFilters.mode || '';
      this.applyFilters();
    }
    if (changes['externalGroupByParent'] && this.externalGroupByParent != null) {
      this.groupByParent = !!this.externalGroupByParent;
      this.buildGroups();
    }
  }

  setViewMode(m: 'paiements' | 'utilisateurs'): void {
    this.mode = m;
    this.viewMode = m;
    // keep users search in sync with toolbar query
    if (m === 'utilisateurs') { this.searchUsers = (this.filtres.q || '').toLowerCase(); }
    this.applyFilters();
  }

  refresh(): void {
    this.loading = true; this.error = '';
    this.http.get<Paiement[]>(`${this.API_BASE}/paiements`).subscribe({
      next: (res) => {
        this.paiements = Array.isArray(res) ? res : [];
        this.paiements.forEach(p => { p.datePaiement = p.datePaiement ? new Date(p.datePaiement) : undefined; (p.echeances || []).forEach(e => e.dateEcheance = e.dateEcheance ? new Date(e.dateEcheance) : undefined); });
        this.applyFilters(); this.loading = false;
      },
      error: (err) => { console.error('[Suivi] refresh error', err); this.error = 'Impossible de charger les paiements.'; this.loading = false; }
    });
  }

  public sansAccents(s?: string): string { return (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase(); }

  /** Normalise et renvoie un libellé de type cohérent */
  libelleType(t?: string, ech?: { id?: number }[] | undefined): string {
    const v = this.sansAccents(t || '');
    // Priorité aux mentions explicites
    if (v.includes('echel') || v.includes('echeanc') || v.includes('echean')) return 'Échelonné';
    if (v.includes('unique') || v.includes('cotis') || v.includes('cotisation')) return 'Unique';
    // Si des échéances sont présentes, considérer comme échelonné
    if (Array.isArray(ech) && ech.length > 0) return 'Échelonné';
    // Valeur par défaut
    return 'Unique';
  }

  /** Normalise et renvoie un libellé de mode de paiement cohérent */
  libelleMode(m?: string): string {
    const v = this.sansAccents(m || '');
    if (!v) return '—';
    if (v.includes('cb') || v.includes('carte') || v.includes('stripe') || v.includes('card')) return 'CB';
    if (v.includes('virement') || v.includes('vir')) return 'Virement';
    // couvrir fautes fréquentes ('espace' -> 'espèces')
    if (v.includes('espec') || v.includes('espace') || v.includes('espece') || v.includes('espèces')) return 'Espèces';
    if (v.includes('cheque') || v.includes('chequ') || v.includes('cheq')) return 'Chèque';
    if (v.includes('paypal')) return 'PayPal';
    return 'Autre';
  }
  classeBadge(statut?: string): string { const s = this.sansAccents(statut); if (s === 'paye') return 'badge badge-success'; if (s === 'annule') return 'badge badge-secondary'; if (s.includes('retard')) return 'badge badge-danger'; if (s.includes('attente')) return 'badge badge-warning'; return 'badge badge-dark'; }

  montantPaye(p: Paiement): number { const total = p.montantTotal || 0; if (Array.isArray(p.echeances) && p.echeances.length) { return p.echeances.reduce((s, e) => { const st = this.sansAccents(e.statut); const m = e.montant || 0; return st === 'paye' ? s + m : s; }, 0); } const st = this.sansAccents(p.statut); return st === 'paye' ? total : 0; }
  montantRestant(p: Paiement): number { const restant = (p.montantTotal || 0) - this.montantPaye(p); return Math.max(0, Number.isFinite(restant) ? restant : 0); }
  montantParEcheance(p: Paiement): number { const typeLisible = this.libelleType(p.type, p.echeances); if (typeLisible !== 'Échelonné') return 0; const ech = p.echeances || []; if (ech.length > 0) return ech[0].montant || 0; const n = (p as any).nombreEcheances || 0; return n > 0 && p.montantTotal ? p.montantTotal / n : 0; }

  applyFilters(): void {
    const q = (this.filtres.q || '').trim().toLowerCase(); const statutF = this.sansAccents(this.filtres.statut); const typeF = this.sansAccents(this.filtres.type); const modeF = this.sansAccents(this.filtres.mode);
    let base = this.paiements;
    if (this.clubFilter !== undefined && this.clubFilter !== 'all') { const filterVal = this.clubFilter; base = base.filter((p: any) => { if (typeof filterVal === 'number') return Number(p.clubId) === Number(filterVal); const clubName = (p.club || p.clubNom || p.clubName || '').toString().toLowerCase(); return clubName.includes(String(filterVal).toLowerCase()); }); }
    this.paiementsFiltres = base.filter(p => { const hay = `${p.utilisateurNom || ''} ${p.utilisateurPrenom || ''} ${p.utilisateurEmail || ''} ${p.membreNom || ''} ${p.membrePrenom || ''}`.toLowerCase(); const typeLisible = this.libelleType(p.type, p.echeances); const modeLisible = this.libelleMode(p.modePaiement); const typeCanon = this.sansAccents(typeLisible); const modeCanon = this.sansAccents(modeLisible); const statutCanon = this.sansAccents(p.statut); const okQ = !q || hay.includes(q); const okStatut = !statutF || statutCanon === statutF; const okType = !typeF || typeCanon.includes(typeF); const okMode = !modeF || modeCanon.includes(modeF); return okQ && okStatut && okType && okMode; });
    this.paiementsFiltres.sort((a, b) => { const da = a.datePaiement ? new Date(a.datePaiement).getTime() : 0; const db = b.datePaiement ? new Date(b.datePaiement).getTime() : 0; if (db !== da) return db - da; return (b.id || 0) - (a.id || 0); });
    this.buildGroups(); this.buildUsersView();
  }

  getClubName(p: Paiement): string { if (!p) return ''; if (p.clubId != null && Array.isArray(this.clubs)) { const found = this.clubs.find(c => Number(c.id) === Number(p.clubId)); if (found) return (found as any).nom || (found as any).name || String(found.id); } return (p.club || p.clubNom || p.clubName || (p.clubId != null ? String(p.clubId) : '')) as string; }

  resetFilters(): void { this.filtres = { q: '', statut: '', type: '', mode: '' }; this.applyFilters(); }

  buildGroups(): void {
    const map = new Map<number, GroupeParent>();
    for (const p of this.paiementsFiltres) {
      const key = p.utilisateurId ?? this.hashUserKey(p);
      const nom = p.utilisateurNom || '';
      const prenom = p.utilisateurPrenom || '';
      const email = p.utilisateurEmail || '';
      const enfant = `${p.membrePrenom || ''} ${p.membreNom || ''}`.trim();
      if (!map.has(key)) { map.set(key, { id: key, nom, prenom, email, enfants: enfant ? [enfant] : [], paiements: [], total: 0, paye: 0, restant: 0, statut: 'en attente' }); }
      const g = map.get(key)!; g.paiements.push(p); if (enfant && !g.enfants.includes(enfant)) g.enfants.push(enfant);
    }
    this.paiementsGroupes = Array.from(map.values()).map(g => { g.total = g.paiements.reduce((s, p) => s + (p.montantTotal || 0), 0); g.paye = g.paiements.reduce((s, p) => s + this.montantPaye(p), 0); g.restant = Math.max(0, g.total - g.paye); const tousPayes = g.paiements.every(p => this.sansAccents(p.statut) === 'paye'); const aDuRetard = g.paiements.some(p => this.sansAccents(p.statut).includes('retard')); g.statut = (tousPayes ? 'payé' : (aDuRetard ? 'en retard' : 'en attente')); return g; });
  }

  private buildUsersView(): void { const q = ((this.filtres.q || this.searchUsers) || '').toLowerCase(); this.utilisateursFiltres = this.paiementsGroupes.filter(g => { if (!q) return true; const hay = `${g.nom} ${g.prenom} ${g.email} ${(g.enfants || []).join(' ')}`.toLowerCase(); return hay.includes(q); }); }
  filtrerUtilisateurs(): void { this.buildUsersView(); }
  private hashUserKey(p: Paiement): number { const base = `${p.utilisateurNom || ''}|${p.utilisateurPrenom || ''}|${p.utilisateurEmail || ''}`; let h = 0; for (let i = 0; i < base.length; i++) h = (h << 5) - h + base.charCodeAt(i); return Math.abs(h); }

  ouvrirEcheances(p: Paiement): void { this.paiementActuel = p; this.modalEcheancesVisible = true; }
  fermerEcheances(): void { this.modalEcheancesVisible = false; this.paiementActuel = null; }

  ouvrirAnnulation(p: Paiement): void { this.paiementActuel = p; this.motifAnnulation = ''; this.annulationError = ''; this.annulationLoading = false; this.modalAnnulationVisible = true; }
  fermerAnnulation(): void { this.modalAnnulationVisible = false; this.paiementActuel = null; this.annulationError = ''; this.annulationLoading = false; }

  userVoirStats(g: GroupeParent): void { this.utilisateurSelectionne = g; this.modalUserStatsVisible = true; this.modalUserEcheancesVisible = false; }
  userVoirEcheances(g: GroupeParent): void {
    // Ensure paiement/echeance dates are Date objects for correct rendering/calculs in the modal
    if (g && Array.isArray(g.paiements)) {
      g.paiements = g.paiements.map(p => ({
        ...p,
        datePaiement: p.datePaiement ? new Date(p.datePaiement) : undefined,
        echeances: Array.isArray(p.echeances) ? p.echeances.map(e => ({ ...e, dateEcheance: e.dateEcheance ? new Date(e.dateEcheance) : undefined })) : p.echeances
      } as Paiement));
    }
    this.utilisateurSelectionne = g; this.modalUserStatsVisible = false; this.modalUserEcheancesVisible = true;
  }
  // Toggle expansion inline (accordion) for a given user
  toggleUserExpansion(u: GroupeParent): void {
    if (!u || u.id == null) return;
    if (this.expandedUsers.has(u.id)) this.expandedUsers.delete(u.id); else this.expandedUsers.add(u.id);
  }
  isUserExpanded(u: GroupeParent): boolean { return !!u && u.id != null && this.expandedUsers.has(u.id); }
  toggleUserFull(u: GroupeParent): void {
    if (!u || u.id == null) return;
    if (this.expandedFullUsers.has(u.id)) this.expandedFullUsers.delete(u.id); else this.expandedFullUsers.add(u.id);
  }
  isUserFull(u: GroupeParent): boolean { return !!u && u.id != null && this.expandedFullUsers.has(u.id); }
  userFermerModales(): void { this.utilisateurSelectionne = null; this.modalUserStatsVisible = false; this.modalUserEcheancesVisible = false; }

  estPayable(p: Paiement): boolean { const s = this.sansAccents(p.statut); return s !== 'annule' && s !== 'paye' && this.montantRestant(p) > 0; }

  marquerPaiementPaye(p: Paiement): void { if (!p?.id) return; if (!confirm('Confirmer : marquer ce paiement comme entièrement payé ?')) return;
    this.http.post(`${this.API_BASE}/paiements/${p.id}/valider`, {}).subscribe({ next: () => { p.statut = 'payé'; if (Array.isArray(p.echeances)) p.echeances = p.echeances.map(e => ({ ...e, statut: 'payé' as Statut })); this.applyFilters(); this.modalEcheancesVisible = false; }, error: (err) => { console.error('[Suivi] marquerPaiementPaye error', err); const serverMsg = err?.error?.message || err?.message || `Erreur ${err?.status || 'inconnue'}`; alert('Impossible de marquer le paiement comme payé.\n' + serverMsg); } }); }

  marquerEcheancePayee(p: Paiement, e: Echeance): void { if (!p?.id || !e?.id) return; const body = [{ id: e.id }];
    this.http.post(`${this.API_BASE}/paiements/${p.id}/payer-echeance`, body).subscribe({ next: () => { e.statut = 'payé'; const restant = this.montantRestant(p); if (restant <= 0) { p.statut = 'payé'; } else { const aDuRetard = (p.echeances || []).some(x => { const st = this.sansAccents(x.statut); return st !== 'paye' && x.dateEcheance && new Date(x.dateEcheance) < new Date(); }); p.statut = aDuRetard ? 'en retard' : 'en attente'; } this.applyFilters(); }, error: (err) => { console.error('[Suivi] marquerEcheancePayee error', err); const serverMsg = err?.error?.message || err?.error || err?.message || `Erreur ${err?.status || 'inconnue'}`; alert('Impossible de marquer l’échéance comme payée.\n' + serverMsg); } }); }

  
  confirmerAnnulation(): void {
    if (!this.paiementActuel?.id) return;
    this.annulationError = '';
    this.annulationLoading = true;
    const isoLocal = new Date().toISOString().slice(0, 19);
    const body = { motif: this.motifAnnulation || 'Annulation par admin', dateAnnulation: isoLocal, adminResponsable: this.utilisateurSelectionne?.email || 'admin' };
    this.http.put(`${this.API_BASE}/paiements/${this.paiementActuel.id}/annuler`, body).subscribe({
      next: (updated: any) => {
        this.annulationLoading = false;
        if (updated?.id) {
          const idx = this.paiements.findIndex(x => x.id === updated.id);
          if (idx > -1) this.paiements[idx] = { ...this.paiements[idx], ...updated };
        } else { this.paiementActuel!.statut = 'annulé'; }
        this.applyFilters();
        this.fermerAnnulation();
      },
      error: (err) => {
        this.annulationLoading = false;
        console.error('[Suivi] confirmerAnnulation error', err);
        const serverMsg = err?.error?.message || err?.message || `Erreur ${err?.status || 'inconnue'}`;
        this.annulationError = serverMsg;
      }
    });
  }

  trackByPaiement: TrackByFunction<Paiement> = (_, p) => p.id;
  trackByEcheance: TrackByFunction<Echeance> = (_, e) => e.id ?? e.numero ?? 0;
  trackByUtilisateur: TrackByFunction<GroupeParent> = (_, u) => u.id;
}
