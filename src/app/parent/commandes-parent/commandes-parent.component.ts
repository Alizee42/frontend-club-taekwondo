import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';


const API_BASE = environment.apiUrl;
const PRIMARY_URL = `${API_BASE}/commandes?scope=parent`; // on fait confiance au scope si pas d'info propriétaire

type StatutCommande = 'en attente' | 'payé' | 'retiré' | 'annulé';
type ModePaiement = 'cb' | 'club';

interface ApiUtilisateur { id: number; nom: string; prenom: string; email: string; }
interface ApiLigne {
  id: number;
  produitId: number;
  produitNom?: string;
  quantite: number;
  prixUnitaire: number;
  sousTotal: number;
  taille?: string | null;
  couleur?: string | null;
  beneficiaireId?: number | null;
  beneficiairePrenom?: string | null;
  beneficiaireNom?: string | null;
}
interface ApiCommande {
  id: number;
  dateCommande: string;        // "YYYY-MM-DD"
  montantTotal: number;
  modePaiement: string | null; // "CB"|"CLUB"|...
  datePaiement?: string | null;
  statut: string;              // "PAYEE"|"EN_ATTENTE"|...
  utilisateurId?: number;      // ⚠️ peut être absent
  utilisateur?: ApiUtilisateur;// ⚠️ peut être absent
  lignesCommande: ApiLigne[];
}

export interface LigneCommandeDTO {
  produitId: number;
  produitNom: string;
  taille?: string | null;
  couleur?: string | null;
  quantite: number;
  prix: number; // total de la ligne
  beneficiaireId?: number | null;
  beneficiairePrenom?: string | null;
  beneficiaireNom?: string | null;
}

export interface CommandeDTO {
  id: number;
  dateCommande: string;
  utilisateurId: number;
  utilisateurNom: string;
  utilisateurPrenom: string;
  utilisateurEmail: string;
  montantTotal: number;
  modePaiement: ModePaiement | '';
  statut: StatutCommande | '';
  lignes: LigneCommandeDTO[];
}

@Component({
  selector: 'app-commandes-parent',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './commandes-parent.component.html',
  styleUrls: ['./commandes-parent.component.css']
})
export class CommandesParentComponent implements OnInit {

  commandes: CommandeDTO[] = [];
  isLoading = false;
  errorMsg = '';
  search = '';

  constructor(private http: HttpClient) {}

  private get headers(): HttpHeaders {
    const token = localStorage.getItem('auth_token') || '';
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  ngOnInit(): void {
    this.chargerCommandes();
  }

  // =========================
  //   JWT & ID utilisateur
  // =========================
  private decodeJwt(token?: string): any {
    try {
      if (!token) return null;
      const part = token.split('.')[1];
      if (!part) return null;
      // base64url -> base64
      const base64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
      return JSON.parse(atob(base64));
    } catch { return null; }
  }
  private getClaims(): any {
    const t = localStorage.getItem('auth_token') || '';
    return this.decodeJwt(t) || {};
  }
  // n'accepte que des entiers strictement positifs ; 0/NaN => null
  private toId(v: any): number | null {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    if (!/^\d+$/.test(s)) return null;
    const n = Number(s);
    return n > 0 ? n : null;
  }
  private getCurrentUserId(): number | null {
    const p = this.getClaims();
    return this.toId(p.userId) ??
           this.toId(p.utilisateurId) ??
           this.toId(p.user_id) ??
           this.toId(p.uid) ??
           this.toId(p.id) ??
           this.toId(p.sub);
  }

  // =========================
  //   Mapping / UI helpers
  // =========================
  private apiStatutToUi(s?: string | null): StatutCommande | '' {
    const val = String(s || '').toUpperCase();
    if (val.includes('PAYE')) return 'payé';
    if (val.includes('EN_ATTENTE') || val.includes('ATTENTE')) return 'en attente';
    if (val.includes('RETIR')) return 'retiré';
    if (val.includes('ANNU')) return 'annulé';
    return '';
  }
  private apiModeToUi(m?: string | null): ModePaiement | '' {
    const val = String(m || '').toUpperCase();
    if (['CB','STRIPE','CARTE','CARTE_BANCAIRE'].includes(val)) return 'cb';
    if (['CLUB','ESPECES','ESPÈCES','VIREMENT'].includes(val)) return 'club';
    return '';
  }

  private mapApiToUi(api: ApiCommande): CommandeDTO {
    let uiStatut = this.apiStatutToUi(api.statut);
    let uiMode   = this.apiModeToUi(api.modePaiement);
    if (api.datePaiement) {
      uiStatut = 'payé';
      if (!uiMode) uiMode = 'cb';
    }

    return {
      id: api.id,
      dateCommande: api.dateCommande ? `${api.dateCommande}T00:00:00` : '',
      utilisateurId: Number(api.utilisateurId ?? api.utilisateur?.id ?? 0),
      utilisateurNom: api.utilisateur?.nom ?? '',
      utilisateurPrenom: api.utilisateur?.prenom ?? '',
      utilisateurEmail: api.utilisateur?.email ?? '',
      montantTotal: Number(api.montantTotal ?? 0),
      modePaiement: uiMode,
      statut: uiStatut,
      lignes: (api.lignesCommande || []).map(l => ({
        produitId: l.produitId,
        produitNom: l.produitNom ?? `Produit #${l.produitId}`,
        taille: l.taille ?? null,
        couleur: l.couleur ?? null,
        quantite: l.quantite,
        prix: Number(l.sousTotal ?? (l.prixUnitaire * l.quantite)),
        beneficiaireId: l.beneficiaireId ?? null,
        beneficiairePrenom: l.beneficiairePrenom ?? null,
        beneficiaireNom: l.beneficiaireNom ?? null,
      }))
    };
  }

  // =========================
  //   Chargement + filtres
  // =========================
  chargerCommandes(): void {
    this.isLoading = true;
    this.errorMsg = '';

    let params = new HttpParams();
    const q = (this.search || '').trim();
    if (q) params = params.set('q', q);

    const me = this.getCurrentUserId();
    if (me != null) params = params.set('utilisateurId', String(me)); // aide serveur si possible

    this.http.get<ApiCommande[]>(PRIMARY_URL, { headers: this.headers, params })
      .subscribe({
        next: (res) => this.handleLoaded(res, /*fromPrimary*/ true),
        error: () => {
          // fallback: /api/commandes
          this.http.get<ApiCommande[]>(`${API_BASE}/commandes`, { headers: this.headers, params })
            .subscribe({
              next: (all) => this.handleLoaded(all, /*fromPrimary*/ false),
              error: (err) => {
                console.error('[Commandes Parent] erreur API', err);
                this.errorMsg = 'Impossible de charger vos commandes.';
                this.isLoading = false;
              }
            });
        }
      });
  }

  private handleLoaded(res: ApiCommande[], fromPrimary: boolean) {
    const me = this.getCurrentUserId(); // null si introuvable
    const arr: ApiCommande[] = Array.isArray(res) ? res : [];

    // présence d'un "owner" dans la réponse
    const hasOwnerField = arr.some(c =>
      (c as any)?.utilisateurId != null || (c as any)?.utilisateur?.id != null
    );

    let list = arr;

    if (hasOwnerField && me != null) {
      // Filtrage précis côté front
      list = arr.filter(c => {
        const uid = this.toId((c as any).utilisateurId ?? (c as any).utilisateur?.id);
        return uid !== null && uid === me;
      });
    } else {
      // Pas d'info propriétaire OU me introuvable :
      // - si ça vient de l'endpoint primaire (scope=parent), on garde tel quel
      // - sinon (fallback + owner dispo + me connu) sera géré plus haut
      list = arr;
    }

    if (!list.length && arr.length) {
      console.debug('[Commandes Parent] 0 après traitement. Exemple brut:', arr[0], { hasOwnerField, me, fromPrimary });
    }

    this.commandes = list
      .map(this.mapApiToUi.bind(this))
      .sort((a, b) => new Date(b.dateCommande).getTime() - new Date(a.dateCommande).getTime());

    this.isLoading = false;
  }

  // =========================
  //   UI helpers
  // =========================
  beneficiaires(c: CommandeDTO): string[] {
    const set = new Set<string>();
    for (const l of (c?.lignes ?? [])) {
      const full = `${l.beneficiairePrenom ?? ''} ${l.beneficiaireNom ?? ''}`.trim();
      if (full) set.add(full);
    }
    return Array.from(set);
  }

  articlesResume(c: CommandeDTO): string {
    const lignes = c?.lignes ?? [];
    if (!lignes.length) return '—';
    const count = lignes.reduce((sum, l) => sum + (Number(l.quantite) || 0), 0);
    const noms = Array.from(new Set(lignes.map(l => l.produitNom || 'Produit').filter(Boolean)));
    const preview = noms.slice(0, 2).join(', ');
    const more = noms.length > 2 ? ` (+${noms.length - 2})` : '';
    return `${count} article${count > 1 ? 's' : ''} • ${preview}${more}`;
  }

  trackByCommande = (_: number, c: CommandeDTO) => c.id;
  trackByMembre = (_: number, m: string) => m;

  // Détails
  commandeSelectionnee: CommandeDTO | null = null;
  voirDetails(c: CommandeDTO) { this.commandeSelectionnee = c; }
  fermerDetails() { this.commandeSelectionnee = null; }

  classeBadgeCommande(statut: string): string {
    const s = (statut || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    if (s.includes('paye')) return 'badge badge-success';
    if (s.includes('attente')) return 'badge badge-warning';
    if (s.includes('retire')) return 'badge badge-secondary';
    if (s.includes('annule')) return 'badge badge-danger';
    return 'badge badge-dark';
  }
}
