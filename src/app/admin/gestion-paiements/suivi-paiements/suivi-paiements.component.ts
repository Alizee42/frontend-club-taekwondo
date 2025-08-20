import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

type Statut = 'payé' | 'en attente' | 'en retard' | 'annulé' | 'inconnu';
type Mode = 'stripe' | 'virement' | 'espèces' | string;
type TypePaiement = 'unique' | 'échelonné' | 'cotisation' | string;

interface Echeance {
  id?: number | string;
  numero?: number;
  dateEcheance?: string;   // ISO
  montant?: number;
  statut?: Statut | string;
  modePaiement?: Mode;     // mode au niveau de l’échéance
}

interface Paiement {
  id?: number | string;
  utilisateurId?: number | string;
  utilisateurNom?: string;
  utilisateurPrenom?: string;
  utilisateurEmail?: string;

  membreNom?: string;
  membrePrenom?: string;

  type?: TypePaiement;
  modePaiement?: Mode;     // mode par défaut (utile surtout pour UNIQUE)
  statut?: Statut | string;
  datePaiement?: string;   // ISO
  montantTotal?: number;
  montantPaye?: number;
  echeances?: Echeance[];
}

interface UtilisateurVM {
  id: number | string;
  nom: string;
  prenom: string;
  email: string;
  paiements: Paiement[];
  enfants?: string[]; // dérivé
}

interface PaiementGroupe {
  id: number | string;
  nom: string;
  prenom: string;
  email: string;
  enfants: string[];
  paiements: Paiement[];
  total: number;
  paye: number;
  restant: number;
  statut: Statut;
}

@Component({
  selector: 'app-suivi-paiements',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './suivi-paiements.component.html',
  styleUrls: ['./suivi-paiements.component.css']
})
export class SuiviPaiementsComponent implements OnInit {

  // Onglets
  mode: 'paiements' | 'utilisateurs' = 'paiements';

  // Groupage par parent (pour l’onglet paiements)
  groupByParent = false;

  // Données
  paiements: Paiement[] = [];
  paiementsFiltres: Paiement[] = [];
  paiementsGroupes: PaiementGroupe[] = [];

  utilisateurs: UtilisateurVM[] = [];
  utilisateursFiltres: UtilisateurVM[] = [];

  // États UI
  loading = false;
  error = '';
  empty = false;

  // Filtres (onglet "Par paiement")
  filtres = {
    q: '',
    statut: '' as '' | Statut,
    type: '' as '' | TypePaiement,
    mode: '' as '' | Mode,
  };

  // Recherche (onglet "Par utilisateur")
  searchUsers = '';

  // Modales
  modalEcheancesVisible = false;
  modalAnnulationVisible = false;
  modalUserStatsVisible = false;
  modalUserEcheancesVisible = false;

  paiementActuel: Paiement | null = null;
  utilisateurSelectionne: UtilisateurVM | null = null;
  motifAnnulation = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void { this.loadPaiements(); }

  // =====================
  //      DATA FETCH
  // =====================
  loadPaiements(): void {
    this.loading = true; this.error = ''; this.empty = false;
    this.http.get<Paiement[]>('/api/paiements').subscribe({
      next: (data) => {
        const list = data ?? [];
        list.forEach(p => p.statut = (p.statut ? (''+p.statut).toLowerCase() : 'inconnu') as Statut);
        this.paiements = list;
        this.applyFilters();
        this.rebuildUtilisateurs();
        this.empty = this.paiements.length === 0;
        this.loading = false;
      },
      error: (err) => {
        console.error('[Suivi] Erreur chargement paiements', err);
        this.error = 'Impossible de charger les paiements.';
        this.loading = false;
      }
    });
  }

  refresh(): void { this.loadPaiements(); }

  // =====================
  //   PAR PAIEMENT
  // =====================
  applyFilters(): void {
    const q = (this.filtres.q || '').toLowerCase().trim();
    const statut = this.filtres.statut;
    const type = this.filtres.type;
    const mode = this.filtres.mode;

    this.paiementsFiltres = (this.paiements || []).filter(p => {
      const txt = `${p.utilisateurPrenom||''} ${p.utilisateurNom||''} ${p.membrePrenom||''} ${p.membreNom||''} ${p.utilisateurEmail||''}`.toLowerCase();
      const okQ = q ? txt.includes(q) : true;
      const okStatut = statut ? (p.statut === statut) : true;
      const okType = type ? (this.norm(p.type) === this.norm(type)) : true;

      // ⚠️ Mode : tient compte du mode des ÉCHÉANCES si type = échelonné
      const okMode = mode
        ? (() => {
            const wanted = this.norm(mode);
            const t = this.norm(p.type);
            if (t === 'unique' || t === 'cotisation') {
              return this.norm(p.modePaiement) === wanted;
            }
            // échelonné : au moins une échéance avec ce mode
            return (p.echeances || []).some(e => this.norm(e.modePaiement) === wanted);
          })()
        : true;

      return okQ && okStatut && okType && okMode;
    });

    // Construire la vue groupée si nécessaire
    this.paiementsGroupes = this.groupPaiementsByParent(this.paiementsFiltres);
  }

  resetFilters(): void {
    this.filtres = { q: '', statut: '', type: '', mode: '' };
    this.applyFilters();
  }

  montantPaye(p: Paiement): number {
    if (typeof p.montantPaye === 'number') return p.montantPaye;
    const ech = p.echeances || [];
    return ech
      .filter(e => (e.statut||'').toLowerCase() === 'payé')
      .reduce((s, e) => s + (e.montant || 0), 0);
  }

  montantRestant(p: Paiement): number {
    const total = p.montantTotal || 0;
    const paye = this.montantPaye(p);
    const r = total - paye;
    return r < 0 ? 0 : r;
  }

  pourcentage(p: Paiement): number {
    const total = p.montantTotal || 0;
    if (total <= 0) return 0;
    return Math.round((this.montantPaye(p) / total) * 100);
  }

  classeBadge(statut: Statut | string | undefined): string {
    switch ((statut || 'inconnu').toLowerCase()) {
      case 'payé': return 'badge badge-success';
      case 'en attente': return 'badge badge-warning';
      case 'en retard': return 'badge badge-danger';
      case 'annulé': return 'badge badge-dark';
      default: return 'badge badge-secondary';
    }
  }

  // Actions paiements
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
    this.modalAnnulationVisible = true;
    this.motifAnnulation = '';
  }
  fermerAnnulation(): void {
    this.modalAnnulationVisible = false;
    this.paiementActuel = null;
  }

  confirmerAnnulation(): void {
    if (!this.paiementActuel) return;
    const id = this.paiementActuel.id;
    this.http.put(`/api/paiements/${id}/annuler`, {
      motif: this.motifAnnulation || 'annulation admin',
      date: new Date().toISOString().slice(0,10),
      admin: 'admin'
    }).subscribe({
      next: () => {
        const p = this.paiements.find(x => x.id === id);
        if (p) p.statut = 'annulé';
        this.applyFilters();
        this.fermerAnnulation();
      },
      error: (err) => {
        console.error('[Suivi] Erreur annulation', err);
        alert('Annulation impossible.');
      }
    });
  }

  // === Groupage par parent : 1 ligne = 1 parent
  private groupPaiementsByParent(list: Paiement[]): PaiementGroupe[] {
    const map = new Map<string | number, PaiementGroupe>();
    for (const p of list) {
      const key = p.utilisateurId ?? `${p.utilisateurNom}-${p.utilisateurPrenom}-${p.utilisateurEmail}`;
      if (!map.has(key)) {
        map.set(key, {
          id: key as any,
          nom: p.utilisateurNom || '',
          prenom: p.utilisateurPrenom || '',
          email: p.utilisateurEmail || '—',
          enfants: [],
          paiements: [],
          total: 0,
          paye: 0,
          restant: 0,
          statut: 'inconnu'
        });
      }
      const g = map.get(key)!;
      g.paiements.push(p);
      const enfant = `${p.membrePrenom || ''} ${p.membreNom || ''}`.trim();
      if (enfant && !g.enfants.includes(enfant)) g.enfants.push(enfant);
    }
    // calculs & statut global
    map.forEach(g => {
      g.total = g.paiements.reduce((s, p) => s + (p.montantTotal || 0), 0);
      g.paye  = g.paiements.reduce((s, p) => s + this.montantPaye(p), 0);
      g.restant = Math.max(g.total - g.paye, 0);
      const st = g.paiements.map(p => (p.statut||'').toLowerCase());
      if (st.some(s => s === 'en retard')) g.statut = 'en retard';
      else if (st.some(s => s === 'en attente')) g.statut = 'en attente';
      else if (st.length && st.every(s => s === 'annulé')) g.statut = 'annulé';
      else if (st.length && st.every(s => s === 'payé')) g.statut = 'payé';
      else g.statut = 'en attente';
    });
    return Array.from(map.values()).sort((a,b) =>
      (a.nom||'').localeCompare(b.nom||'') || (a.prenom||'').localeCompare(b.prenom||''));
  }

  // =====================
  //   PAR UTILISATEUR
  // =====================
  rebuildUtilisateurs(): void {
    const map = new Map<string | number, UtilisateurVM>();
    (this.paiements || []).forEach(p => {
      const id = p.utilisateurId ?? `${p.utilisateurNom}-${p.utilisateurPrenom}-${p.utilisateurEmail}`;
      if (!map.has(id)) {
        map.set(id, {
          id,
          nom: p.utilisateurNom || '',
          prenom: p.utilisateurPrenom || '',
          email: p.utilisateurEmail || '—',
          paiements: [],
          enfants: []
        });
      }
      const u = map.get(id)!;
      u.paiements.push(p);
      const enfant = `${p.membrePrenom || ''} ${p.membreNom || ''}`.trim();
      if (enfant && !u.enfants!.includes(enfant)) u.enfants!.push(enfant);
    });
    this.utilisateurs = Array.from(map.values()).sort((a,b) =>
      (a.nom||'').localeCompare(b.nom||'') || (a.prenom||'').localeCompare(b.prenom||'')
    );
    this.filtrerUtilisateurs();
  }

  filtrerUtilisateurs(): void {
    const q = (this.searchUsers || '').toLowerCase().trim();
    if (!q) { this.utilisateursFiltres = [...this.utilisateurs]; return; }
    this.utilisateursFiltres = this.utilisateurs.filter(u => {
      const nom = `${u.prenom} ${u.nom}`.toLowerCase();
      const email = (u.email||'').toLowerCase();
      const enfants = (u.enfants || []).join(' ').toLowerCase();
      return nom.includes(q) || email.includes(q) || enfants.includes(q);
    });
  }

  statutGlobal(u: UtilisateurVM): Statut {
    const ps = u.paiements || [];
    if (!ps.length) return 'inconnu';
    if (ps.some(p => p.statut === 'en retard')) return 'en retard';
    if (ps.some(p => p.statut === 'en attente')) return 'en attente';
    if (ps.every(p => p.statut === 'annulé')) return 'annulé';
    if (ps.every(p => p.statut === 'payé')) return 'payé';
    return 'en attente';
  }

  // Modales côté utilisateur
  userVoirStats(u: UtilisateurVM): void {
    this.utilisateurSelectionne = u;
    this.modalUserEcheancesVisible = false;
    this.modalUserStatsVisible = true;
  }
  userVoirEcheances(u: UtilisateurVM): void {
    this.utilisateurSelectionne = u;
    this.modalUserStatsVisible = false;
    this.modalUserEcheancesVisible = true;
  }
  userFermerModales(): void {
    this.modalUserStatsVisible = false;
    this.modalUserEcheancesVisible = false;
    this.utilisateurSelectionne = null;
  }

  // TrackBy
  trackByPaiement = (_: number, p: Paiement) => p.id ?? `${p.utilisateurEmail}-${p.datePaiement}-${p.montantTotal}`;
  trackByUtilisateur = (_: number, u: UtilisateurVM) => u.id ?? `${u.email}-${u.nom}`;
  trackByEcheance = (_: number, e: Echeance) => e.id ?? `${e.numero}-${e.dateEcheance}-${e.montant}`;

  /* ===========================
   *  Helpers libellés & norm
   * =========================== */

  /** Normalise pour comparaison (minuscule + sans accents) */
  private norm(v?: string): string {
    return (v || '')
      .toString()
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  /** Type très simple : Unique / Échéances / Cotisation */
  libelleType(type?: string): string {
    switch (this.norm(type)) {
      case 'unique':       return 'Unique';
      case 'echelonne':
      case 'echelonné':
      case 'echeances':
      case 'echeance':     return 'Échéances';
      case 'cotisation':   return 'Cotisation';
      default:             return type || '—';
    }
  }

  /** Mode très simple : cb / Virement / Espèces */
  libelleMode(mode?: string): string {
    const m = this.norm(mode);
    if (['stripe','carte','carte bancaire','cb','cartebancaire'].includes(m)) return 'cb';
    if (m === 'virement') return 'Virement';
    if (m === 'especes' || m === 'espèces') return 'Espèces';
    return mode || '—';
  }

  /** Résumé du mode pour affichage ligne : unique -> modePaiement, échelonné -> agrège les échéances */
  modeGlobal(p: Paiement): string {
    const t = this.norm(p.type);
    if (t === 'unique' || t === 'cotisation') {
      return this.libelleMode(p.modePaiement);
    }
    const modes = new Set(
      (p.echeances || [])
        .map(e => this.libelleMode(e.modePaiement))
        .filter(x => !!x && x !== '—')
    );
    if (modes.size === 0) return '—';
    if (modes.size === 1) return Array.from(modes)[0]!;
    return 'Mixte';
  }

  /** Evite "Échéances – echeances" : on n’ajoute le mode qu’aux paiements uniques/cotisation */
  typeDePaiement(p: Paiement): string {
    const t = this.norm(p.type);
    if (t === 'unique' || t === 'cotisation') {
      return `${this.libelleType(p.type)} – ${this.libelleMode(p.modePaiement)}`;
    }
    return this.libelleType(p.type); // "Échéances"
  }
}
