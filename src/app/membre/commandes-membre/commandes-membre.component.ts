import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgFor, DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';


const API_BASE = environment.apiUrl;
const PRIMARY_URL = `${API_BASE}/commandes?scope=membre`; 

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
  dateCommande: string;
  montantTotal: number;
  modePaiement: string | null;
  datePaiement?: string | null;
  statut: string;
  utilisateurId: number;       // parent payeur
  utilisateur: ApiUtilisateur;
  lignesCommande: ApiLigne[];
}

export interface LigneCommandeDTO {
  produitId: number;
  produitNom: string;
  taille?: string | null;
  couleur?: string | null;
  quantite: number;
  prix: number;
  beneficiaireId?: number | null;
  beneficiairePrenom?: string | null;
  beneficiaireNom?: string | null;
}

export interface CommandeDTO {
  id: number;
  dateCommande: string;
  parentNom: string;
  parentPrenom: string;
  montantTotal: number;
  modePaiement: ModePaiement | '';
  statut: StatutCommande | '';
  lignes: LigneCommandeDTO[];
}

@Component({
  selector: 'app-commandes-membre',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgIf, NgFor,          
    DatePipe, CurrencyPipe 
  ],
  templateUrl: './commandes-membre.component.html',
  styleUrls: ['./commandes-membre.component.css']
})
export class CommandesMembreComponent implements OnInit {

  commandes: CommandeDTO[] = [];
  isLoading = false;
  errorMsg = '';
  search = '';

  constructor(private http: HttpClient) {}

  private get headers(): HttpHeaders {
    const token = localStorage.getItem('auth_token') || '';
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  private decodeJwt(token?: string): any {
    try {
      if (!token) return null;
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch { return null; }
  }

  private getCurrentMembreId(): number | null {
    const token = localStorage.getItem('auth_token') || '';
    const p = this.decodeJwt(token) || {};
    return Number(p.membreId ?? p.memberId ?? NaN) || null;
  }

  ngOnInit(): void {
    this.chargerCommandes();
  }

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
      parentNom: api.utilisateur?.nom ?? '',
      parentPrenom: api.utilisateur?.prenom ?? '',
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

  chargerCommandes(): void {
    this.isLoading = true;
    this.errorMsg = '';

    let params = new HttpParams();
    const q = (this.search || '').trim();
    if (q) params = params.set('q', q);

    this.http.get<ApiCommande[]>(PRIMARY_URL, { headers: this.headers, params })
      .subscribe({
        next: (res) => this.handleLoaded(res),
        error: () => {
          // fallback: tout puis filtrage client par beneficiaireId = membreId
          this.http.get<ApiCommande[]>(`${API_BASE}/commandes`, { headers: this.headers, params })
            .subscribe({
              next: (all) => {
                const mid = this.getCurrentMembreId();
                const filtered = Array.isArray(all) ? all.filter(cmd =>
                  (cmd.lignesCommande || []).some(l => mid && l.beneficiaireId === mid)
                ) : [];
                this.handleLoaded(filtered);
              },
              error: (err) => {
                console.error('[Commandes Membre] erreur API', err);
                this.errorMsg = 'Impossible de charger vos commandes.';
                this.isLoading = false;
              }
            });
        }
      });
  }

  private handleLoaded(res: ApiCommande[]) {
    const mid = this.getCurrentMembreId();
    const list = (Array.isArray(res) ? res : []).filter(cmd => {
      // afficher uniquement les commandes où AU MOINS une ligne
      // a beneficiaireId === membre connecté
      return mid ? (cmd.lignesCommande || []).some(l => l.beneficiaireId === mid) : false;
    });
  
    this.commandes = list
      .map(this.mapApiToUi.bind(this))
      .sort((a, b) => new Date(b.dateCommande).getTime() - new Date(a.dateCommande).getTime());
  
    this.isLoading = false;
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
