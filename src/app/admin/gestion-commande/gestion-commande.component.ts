import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';


const API_BASE = environment.apiUrl;
// ==== Types UI (template) ====
type StatutCommande = 'en attente' | 'payé' | 'retiré' | 'annulé';
type ModePaiement = 'cb' | 'club';

export interface LigneCommandeDTO {
  produitId: number;
  produitNom: string;
  taille?: string | null;
  couleur?: string | null;
  quantite: number;
  prix: number; // total de la ligne
  imageUrl?: string;
  // Bénéficiaire (optionnel — s’affiche juste dans la modale si présent)
  beneficiaireId?: number | null;
  beneficiairePrenom?: string | null;
  beneficiaireNom?: string | null;
}

export interface CommandeDTO {
  id: number;
  dateCommande: string; // ex: "2025-09-04T00:00:00"
  utilisateurId: number;
  utilisateurNom: string;
  utilisateurPrenom: string;
  utilisateurEmail: string;
  montantTotal: number;
  modePaiement: ModePaiement | ''; // '' si inconnu
  statut: StatutCommande | '';
  lignes: LigneCommandeDTO[];
   beneficiaireId?: number | null;
  beneficiairePrenom?: string | null;
  beneficiaireNom?: string | null;
}

// ==== Types API (retour back) ====
interface ApiUtilisateur {
  id: number;
  nom: string;
  prenom: string;
  email: string;
}
interface ApiLigne {
  id: number;
  produitId: number;
  produitNom?: string;
  quantite: number;
  prixUnitaire: number;
  sousTotal: number;
  taille?: string | null;
  couleur?: string | null;
  flocage?: string | null;
  beneficiaireId?: number | null;
  beneficiairePrenom?: string | null;
  beneficiaireNom?: string | null;
}
interface ApiCommande {
  id: number;
  dateCommande: string;        // "YYYY-MM-DD"
  montantTotal: number;
  modePaiement: string | null; // "CB" | "CLUB" | "ESPECES" | "VIREMENT" | null
  datePaiement?: string | null;// "YYYY-MM-DD" si payé
  statut: string;              // "PAYEE" | "EN_ATTENTE" | "RETIRE" | "ANNULE"...
  disponibleAuClub?: boolean | null;
  utilisateurId: number;
  utilisateur: ApiUtilisateur;
  lignesCommande: ApiLigne[];
}

@Component({
  selector: 'app-gestion-commande',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-commande.component.html',
  styleUrls: ['./gestion-commande.component.css']
})
export class GestionCommandeComponent implements OnInit {
  // 🔎 Filtres (UI)
  search: string = '';
  statutFilter: '' | StatutCommande = '';
  modeFilter: '' | ModePaiement = '';

  // 📋 Données
  commandes: CommandeDTO[] = [];

  // 🔍 Modale détails
  commandeSelectionnee: CommandeDTO | null = null;

  // Etat UI
  isLoading = false;
  errorMsg = '';

  // 🎫 Auth (si token admin)
  private get headers(): HttpHeaders {
    const token = localStorage.getItem('auth_token') || '';
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }
  // Corps texte brut pour /statut
  private get textHeaders(): HttpHeaders {
    return this.headers.set('Content-Type', 'text/plain; charset=utf-8');
  }

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.chargerCommandes();
  }

  // =========================
  //     HELPERS mapping UI/API
  // =========================
  private apiStatutToUi(s?: string | null): StatutCommande | '' {
    const val = String(s || '').toUpperCase();
    if (val === 'PAYEE' || val === 'PAYE' || val === 'PAYÉE') return 'payé';
    if (val === 'EN_ATTENTE' || val === 'EN COURS' || val === 'EN_COURS') return 'en attente';
    if (val === 'RETIRE' || val === 'RETIRÉ' || val === 'RETIREE') return 'retiré';
    if (val === 'ANNULE' || val === 'ANNULÉ') return 'annulé';
    return '';
  }
  private uiStatutToApi(s: StatutCommande): string {
    switch (s) {
      case 'payé':        return 'PAYEE';
      case 'en attente':  return 'EN_ATTENTE';
      case 'retiré':      return 'RETIRE';
      case 'annulé':      return 'ANNULE';
      default:            return 'EN_ATTENTE';
    }
  }

  private apiModeToUi(m?: string | null): ModePaiement | '' {
    const val = String(m || '').toUpperCase();
    if (val === 'CB' || val === 'STRIPE' || val === 'CARTE' || val === 'CARTE_BANCAIRE') return 'cb';
    if (val === 'CLUB' || val === 'ESPECES' || val === 'ESPÈCES' || val === 'VIREMENT') return 'club';
    return '';
  }
  private uiModeToApi(m: ModePaiement): string {
    return m === 'cb' ? 'CB' : 'CLUB';
  }

  private mapApiToUi(api: ApiCommande): CommandeDTO {
    // ❶ conversion de base
    let uiStatut = this.apiStatutToUi(api.statut);
    let uiMode   = this.apiModeToUi(api.modePaiement);
  
    // ❷ si une date de paiement existe, forcer "payé"
    if (api.datePaiement) {
      uiStatut = 'payé';
      if (!uiMode) uiMode = 'cb';
    }
  
    return {
      id: api.id,
      dateCommande: api.dateCommande ? `${api.dateCommande}T00:00:00` : '',
      utilisateurId: api.utilisateurId,
      utilisateurNom: api.utilisateur?.nom ?? '',
      utilisateurPrenom: api.utilisateur?.prenom ?? '',
      utilisateurEmail: api.utilisateur?.email ?? '',
      montantTotal: Number(api.montantTotal ?? 0),
      modePaiement: uiMode,
      statut: uiStatut,
      lignes: (api.lignesCommande || []).map((l) => ({
        produitId: l.produitId,
        produitNom: l.produitNom ?? `Produit #${l.produitId}`,
        taille: l.taille ?? null,
        couleur: l.couleur ?? null,
        quantite: l.quantite,
        prix: Number(l.sousTotal ?? (l.prixUnitaire * l.quantite)),
        imageUrl: undefined,
        // ⬇️⬇️ CORRECTIF ICI : on lit sur la ligne, pas sur api
        beneficiaireId: l.beneficiaireId ?? null,
        beneficiairePrenom: l.beneficiairePrenom ?? null,
        beneficiaireNom: l.beneficiaireNom ?? null,
      }))
    };
  }
  
  // =========================
  //     CHARGEMENT / FILTRES
  // =========================
  private mapFiltersToApiParams(params: HttpParams): HttpParams {
    let p = params;
    if (this.statutFilter) {
      p = p.set('statut', this.uiStatutToApi(this.statutFilter));
    }
    if (this.modeFilter) {
      p = p.set('mode', this.uiModeToApi(this.modeFilter));
    }
    return p;
  }

  chargerCommandes(): void {
    this.isLoading = true;
    this.errorMsg = '';

    let params = new HttpParams();
    const q = (this.search || '').trim();
    if (q) params = params.set('q', q);
    params = this.mapFiltersToApiParams(params);

    this.http.get<ApiCommande[]>(`${API_BASE}/commandes`, { params, headers: this.headers })
      .subscribe({
        next: (res) => {
          const list = Array.isArray(res) ? res : [];
          this.commandes = list
            .map(this.mapApiToUi.bind(this))
            .sort((a, b) => new Date(b.dateCommande).getTime() - new Date(a.dateCommande).getTime());
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Erreur chargement commandes', err);
          this.errorMsg = 'Impossible de charger les commandes.';
          this.isLoading = false;
        }
      });
  }

  onSearchChange(): void {
    this.chargerCommandes();
  }

  // =========================
  //          ACTIONS
  // =========================
  private ensureModeClubIfMissing(c: CommandeDTO): Promise<void> {
    // Si mode manquant pour une commande “au club”, on force côté back avant de valider.
    if (c.modePaiement === 'club') return Promise.resolve();
    return new Promise((resolve, reject) => {
      const body = { modePaiement: 'CLUB' };
      this.http.put<void>(`${API_BASE}/commandes/${c.id}`, body, { headers: this.headers })
        .subscribe({
          next: () => { c.modePaiement = 'club'; resolve(); },
          error: (e) => {
            console.error('[ERR] mise à jour modePaiement', e);
            alert("Impossible de définir le mode de paiement à 'CLUB'.");
            reject(e);
          }
        });
    });
  }

  marquerPaye(id: number): void {
    const c = this.commandes.find(x => x.id === id);
    if (!c) return;
    if (!confirm('Confirmer le marquage en PAYÉ ?')) return;

    // Uniquement pour “club” (les CB sont payées automatiquement par Stripe)
    this.ensureModeClubIfMissing(c)
      .then(() => {
        const payload = {
          statut: 'PAYEE',
          modePaiement: 'CLUB',
          datePaiement: new Date().toISOString().slice(0, 10) // YYYY-MM-DD
        };
        this.http.put<void>(`${API_BASE}/commandes/${id}/valider`, payload, { headers: this.headers })
          .subscribe({
            next: () => { c.statut = 'payé'; },
            error: (err) => {
              console.error('[API ERR] valider paiement', err);
              // Plan B : endpoint statut brut
              this.http.put<void>(`${API_BASE}/commandes/${id}/statut`, 'PAYEE', { headers: this.textHeaders })
                .subscribe({
                  next: () => { c.statut = 'payé'; },
                  error: (e2) => {
                    console.error('[API ERR] /statut PAYEE', e2);
                    alert("Échec du marquage en 'payé'.");
                  }
                });
            }
          });
      })
      .catch(() => {/* déjà alerté */});
  }

  marquerRetiree(id: number): void {
    const c = this.commandes.find(x => x.id === id);
    if (!c) return;
    if (!confirm('Confirmer le marquage en RETIRÉ ?')) return;

    this.http.put<void>(`${API_BASE}/commandes/${id}/statut`, 'RETIRE', { headers: this.textHeaders })
      .subscribe({
        next: () => { c.statut = 'retiré'; },
        error: (err) => {
          console.error('Erreur marquer retiré', err);
          alert("Échec du marquage en 'retiré'.");
        }
      });
  }

  annulerCommande(id: number): void {
    const c = this.commandes.find(x => x.id === id);
    if (!c) return;
    if (!confirm('Annuler cette commande ?')) return;

    this.http.put<void>(`${API_BASE}/commandes/${id}/statut`, 'ANNULE', { headers: this.textHeaders })
      .subscribe({
        next: () => { c.statut = 'annulé'; },
        error: (err) => {
          console.error('Erreur annulation', err);
          alert("Échec de l'annulation.");
        }
      });
  }
// Résume "pour qui" à partir des lignes (bénéficiaire par ligne)
// Résume "Pour : …" à partir des lignes
beneficiaires(c: { lignes?: Array<{ beneficiairePrenom?: string|null; beneficiaireNom?: string|null }> }): string[] {
  const set = new Set<string>();
  for (const l of (c?.lignes ?? [])) {
    const full = `${l.beneficiairePrenom ?? ''} ${l.beneficiaireNom ?? ''}`.trim();
    if (full) set.add(full);
  }
  return Array.from(set);
}

trackByMembre = (_: number, m: string) => m;



  // =========================
  //    STEPPER / TRANSITIONS
  // =========================
  private normalize(txt?: string): string {
    return String(txt || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[_\-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  private nStatut(c: CommandeDTO): string { return this.normalize(c.statut as string); }
  private nMode(c: CommandeDTO): string { return this.normalize(c.modePaiement as string); }

  // “Payé” cliquable uniquement pour les paiements au club
  canGoPaid(c: CommandeDTO): boolean {
    const s = this.nStatut(c);
    const m = this.nMode(c);
    return s === 'en attente' && (m === 'club' || m === '');
  }
  canGoRetired(c: CommandeDTO): boolean {
    const s = this.nStatut(c);
    return (s === 'paye' || s === 'payé');
  }

  goPaid(c: CommandeDTO): void {
    if (!this.canGoPaid(c)) return;
    this.marquerPaye(c.id);
  }
  goRetired(c: CommandeDTO): void {
    if (!this.canGoRetired(c)) return;
    this.marquerRetiree(c.id);
  }

  // =========================
  //   UI helpers
  // =========================
  classeBadgeCommande(statut: string): string {
    const s = this.normalize(statut);
    if (s === 'paye' || s === 'payé') return 'badge badge-success';
    if (s === 'en attente' || s === 'attente') return 'badge badge-warning';
    if (s === 'retire' || s === 'retiré') return 'badge badge-secondary';
    if (s === 'annule' || s === 'annulé') return 'badge badge-danger';
    return 'badge badge-dark';
  }

  trackByCommande = (_: number, c: CommandeDTO) => c.id;

  // =========================
  //        DÉTAILS
  // =========================
  voirDetails(c: CommandeDTO): void {
    this.commandeSelectionnee = c;
  }
  fermerDetails(): void {
    this.commandeSelectionnee = null;
  }
}
