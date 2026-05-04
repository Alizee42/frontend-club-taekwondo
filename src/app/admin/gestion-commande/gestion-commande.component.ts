import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { UiTableColumn, UiTableComponent } from '../../shared/components/ui-table/ui-table.component';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';
import { UiModalComponent } from '../../shared/ui/modal/ui-modal.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { KpiCardComponent } from '../../shared/ui/kpi-card/kpi-card.component';
import { KpiGridComponent } from '../../shared/ui/kpi-grid/kpi-grid.component';

const API_BASE = environment.apiUrl;

type StatutCommande = 'en attente' | 'paye' | 'retire' | 'annule';
type ModePaiement = 'cb' | 'club';

export interface LigneCommandeDTO {
  produitId: number;
  produitNom: string;
  taille?: string | null;
  couleur?: string | null;
  quantite: number;
  prix: number;
  imageUrl?: string;
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
  utilisateurId: number;
  utilisateur: ApiUtilisateur;
  lignesCommande: ApiLigne[];
}

@Component({
  selector: 'app-gestion-commande',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    UiTableComponent,
    UiButtonComponent,
    UiModalComponent,
    PageHeaderComponent,
    KpiCardComponent,
    KpiGridComponent
  ],
  templateUrl: './gestion-commande.component.html',
  styleUrls: ['./gestion-commande.component.css']
})
export class GestionCommandeComponent implements OnInit {
  search = '';
  statutFilter: '' | StatutCommande = '';
  modeFilter: '' | ModePaiement = '';

  commandes: CommandeDTO[] = [];
  commandeSelectionnee: CommandeDTO | null = null;
  isLoading = false;
  errorMsg = '';

  get nbCommandes()  { return this.commandes.length; }
  get montantCA()    { return this.commandes.reduce((s, c) => s + (c.montantTotal || 0), 0); }
  get nbEnAttente()  { return this.commandes.filter(c => c.statut === 'en attente').length; }
  get nbAnnulees()   { return this.commandes.filter(c => c.statut === 'annule').length; }

  readonly textHeaders = new HttpHeaders({ 'Content-Type': 'text/plain; charset=utf-8' });

  readonly columns: UiTableColumn[] = [
    {
      key: 'dateCommande',
      label: 'Date',
      width: '110px',
      display: (row: CommandeDTO) => this.formatDate(row.dateCommande)
    },
    {
      key: 'client',
      label: 'Client',
      width: '220px',
      render: (row: CommandeDTO) => this.renderClient(row)
    },
    {
      key: 'beneficiaires',
      label: 'Membres',
      width: '250px',
      render: (row: CommandeDTO) => this.renderBeneficiaires(row)
    },
    {
      key: 'modePaiement',
      label: 'Mode',
      width: '150px',
      display: (row: CommandeDTO) => this.formatMode(row.modePaiement)
    },
    {
      key: 'montantTotal',
      label: 'Total',
      width: '130px',
      cellClass: 'td-right',
      headerClass: 'th-right',
      display: (row: CommandeDTO) => this.formatCurrency(row.montantTotal)
    },
    {
      key: 'statut',
      label: 'Statut',
      width: '150px',
      render: (row: CommandeDTO) => this.renderStatut(row.statut)
    }
  ];

  readonly detailColumns: UiTableColumn[] = [
    {
      key: 'produitNom',
      label: 'Produit',
      width: '220px',
      render: (row: LigneCommandeDTO) => this.renderProduit(row)
    },
    {
      key: 'options',
      label: 'Options',
      render: (row: LigneCommandeDTO) => this.renderOptions(row)
    },
    {
      key: 'quantite',
      label: 'Qté',
      width: '80px',
      cellClass: 'td-right',
      headerClass: 'th-right',
      display: (row: LigneCommandeDTO) => String(row.quantite)
    },
    {
      key: 'prix',
      label: 'Prix',
      width: '120px',
      cellClass: 'td-right',
      headerClass: 'th-right',
      display: (row: LigneCommandeDTO) => this.formatCurrency(row.prix)
    }
  ];

  readonly actions = [
    { label: 'Details', icon: 'ri-eye-line', action: 'details', variant: 'primary' as const, title: 'Voir les details' },
    { label: 'Marquer paye', icon: 'ri-checkbox-circle-line', action: 'pay', variant: 'secondary' as const, title: 'Marquer paye', show: (row: CommandeDTO) => this.canGoPaid(row) },
    { label: 'Marquer retire', icon: 'ri-hand-heart-line', action: 'retire', variant: 'secondary' as const, title: 'Marquer retire', show: (row: CommandeDTO) => this.canGoRetired(row) },
    { label: 'Annuler', icon: 'ri-close-circle-line', action: 'cancel', variant: 'danger' as const, title: 'Annuler la commande', show: (row: CommandeDTO) => this.normalize(row.statut) === 'en attente' }
  ];

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.chargerCommandes();
  }

  get detailRows(): LigneCommandeDTO[] {
    return this.commandeSelectionnee?.lignes ?? [];
  }

  onFiltersChange(): void {
    this.chargerCommandes();
  }

  resetFilters(): void {
    this.search = '';
    this.statutFilter = '';
    this.modeFilter = '';
    this.chargerCommandes();
  }

  onTableAction(event: { action: string; row: CommandeDTO }): void {
    if (event.action === 'details') {
      this.voirDetails(event.row);
      return;
    }

    if (event.action === 'pay') {
      this.goPaid(event.row);
      return;
    }

    if (event.action === 'retire') {
      this.goRetired(event.row);
      return;
    }

    if (event.action === 'cancel') {
      this.annulerCommande(event.row.id);
    }
  }

  chargerCommandes(): void {
    this.isLoading = true;
    this.errorMsg = '';

    let params = new HttpParams();
    const query = this.search.trim();

    if (query) {
      params = params.set('q', query);
    }

    if (this.statutFilter) {
      params = params.set('statut', this.uiStatutToApi(this.statutFilter));
    }

    if (this.modeFilter) {
      params = params.set('mode', this.uiModeToApi(this.modeFilter));
    }

    this.http.get<ApiCommande[]>(`${API_BASE}/commandes`, { params }).subscribe({
      next: (res) => {
        const list = Array.isArray(res) ? res : [];
        this.commandes = list
          .map((commande) => this.mapApiToUi(commande))
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

  marquerPaye(id: number): void {
    const commande = this.commandes.find((item) => item.id === id);

    if (!commande || !confirm('Confirmer le marquage en PAYE ?')) {
      return;
    }

    this.ensureModeClubIfMissing(commande)
      .then(() => {
        const payload = {
          statut: 'PAYEE',
          modePaiement: 'CLUB',
          datePaiement: new Date().toISOString().slice(0, 10)
        };

        this.http.put<void>(`${API_BASE}/commandes/${id}/valider`, payload).subscribe({
          next: () => {
            commande.statut = 'paye';
            this.syncSelectedCommande(commande);
          },
          error: () => {
            this.http.put<void>(`${API_BASE}/commandes/${id}/statut`, 'PAYEE', { headers: this.textHeaders }).subscribe({
              next: () => {
                commande.statut = 'paye';
                this.syncSelectedCommande(commande);
              },
              error: (innerErr) => {
                console.error('[API ERR] /statut PAYEE', innerErr);
                alert("Echec du marquage en 'paye'.");
              }
            });
          }
        });
      })
      .catch(() => undefined);
  }

  marquerRetiree(id: number): void {
    const commande = this.commandes.find((item) => item.id === id);

    if (!commande || !confirm('Confirmer le marquage en RETIRE ?')) {
      return;
    }

    this.http.put<void>(`${API_BASE}/commandes/${id}/statut`, 'RETIRE', { headers: this.textHeaders }).subscribe({
      next: () => {
        commande.statut = 'retire';
        this.syncSelectedCommande(commande);
      },
      error: (err) => {
        console.error('Erreur marquer retire', err);
        alert("Echec du marquage en 'retire'.");
      }
    });
  }

  annulerCommande(id: number): void {
    const commande = this.commandes.find((item) => item.id === id);

    if (!commande || !confirm('Annuler cette commande ?')) {
      return;
    }

    this.http.put<void>(`${API_BASE}/commandes/${id}/statut`, 'ANNULE', { headers: this.textHeaders }).subscribe({
      next: () => {
        commande.statut = 'annule';
        this.syncSelectedCommande(commande);
      },
      error: (err) => {
        console.error('Erreur annulation', err);
        alert("Echec de l'annulation.");
      }
    });
  }

  voirDetails(commande: CommandeDTO): void {
    this.commandeSelectionnee = commande;
  }

  fermerDetails(): void {
    this.commandeSelectionnee = null;
  }

  canGoPaid(commande: CommandeDTO): boolean {
    const statut = this.normalize(commande.statut);
    const mode = this.normalize(commande.modePaiement);
    return statut === 'en attente' && (mode === 'club' || mode === '');
  }

  canGoRetired(commande: CommandeDTO): boolean {
    const statut = this.normalize(commande.statut);
    return statut === 'paye';
  }

  goPaid(commande: CommandeDTO): void {
    if (this.canGoPaid(commande)) {
      this.marquerPaye(commande.id);
    }
  }

  goRetired(commande: CommandeDTO): void {
    if (this.canGoRetired(commande)) {
      this.marquerRetiree(commande.id);
    }
  }

  private syncSelectedCommande(commande: CommandeDTO): void {
    if (this.commandeSelectionnee?.id === commande.id) {
      this.commandeSelectionnee = { ...commande };
    }
  }

  private ensureModeClubIfMissing(commande: CommandeDTO): Promise<void> {
    if (commande.modePaiement === 'club') {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.http.put<void>(`${API_BASE}/commandes/${commande.id}`, { modePaiement: 'CLUB' }).subscribe({
        next: () => {
          commande.modePaiement = 'club';
          resolve();
        },
        error: (err) => {
          console.error('[ERR] mise a jour modePaiement', err);
          alert("Impossible de definir le mode de paiement a 'CLUB'.");
          reject(err);
        }
      });
    });
  }

  private mapApiToUi(api: ApiCommande): CommandeDTO {
    let statut = this.apiStatutToUi(api.statut);
    let modePaiement = this.apiModeToUi(api.modePaiement);

    if (api.datePaiement) {
      statut = 'paye';
      if (!modePaiement) {
        modePaiement = 'cb';
      }
    }

    return {
      id: api.id,
      dateCommande: api.dateCommande ? `${api.dateCommande}T00:00:00` : '',
      utilisateurId: api.utilisateurId,
      utilisateurNom: api.utilisateur?.nom ?? '',
      utilisateurPrenom: api.utilisateur?.prenom ?? '',
      utilisateurEmail: api.utilisateur?.email ?? '',
      montantTotal: Number(api.montantTotal ?? 0),
      modePaiement,
      statut,
      lignes: (api.lignesCommande || []).map((ligne) => ({
        produitId: ligne.produitId,
        produitNom: ligne.produitNom ?? `Produit #${ligne.produitId}`,
        taille: ligne.taille ?? null,
        couleur: ligne.couleur ?? null,
        quantite: ligne.quantite,
        prix: Number(ligne.sousTotal ?? ligne.prixUnitaire * ligne.quantite),
        imageUrl: undefined,
        beneficiaireId: ligne.beneficiaireId ?? null,
        beneficiairePrenom: ligne.beneficiairePrenom ?? null,
        beneficiaireNom: ligne.beneficiaireNom ?? null
      }))
    };
  }

  private apiStatutToUi(statut?: string | null): StatutCommande | '' {
    const value = String(statut || '').toUpperCase();
    if (value === 'PAYEE' || value === 'PAYE' || value === 'PAYÉE') return 'paye';
    if (value === 'EN_ATTENTE' || value === 'EN COURS' || value === 'EN_COURS') return 'en attente';
    if (value === 'RETIRE' || value === 'RETIRÉ' || value === 'RETIREE') return 'retire';
    if (value === 'ANNULE' || value === 'ANNULÉ') return 'annule';
    return '';
  }

  private uiStatutToApi(statut: StatutCommande): string {
    switch (statut) {
      case 'paye': return 'PAYEE';
      case 'en attente': return 'EN_ATTENTE';
      case 'retire': return 'RETIRE';
      case 'annule': return 'ANNULE';
      default: return 'EN_ATTENTE';
    }
  }

  private apiModeToUi(mode?: string | null): ModePaiement | '' {
    const value = String(mode || '').toUpperCase();
    if (value === 'CB' || value === 'STRIPE' || value === 'CARTE' || value === 'CARTE_BANCAIRE') return 'cb';
    if (value === 'CLUB' || value === 'ESPECES' || value === 'ESPÈCES' || value === 'VIREMENT') return 'club';
    return '';
  }

  private uiModeToApi(mode: ModePaiement): string {
    return mode === 'cb' ? 'CB' : 'CLUB';
  }

  private normalize(value?: string): string {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private formatDate(value: string): string {
    return value ? new Date(value).toLocaleDateString('fr-FR') : '-';
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(value || 0));
  }

  formatMode(mode: ModePaiement | ''): string {
    if (mode === 'cb') return 'CB';
    if (mode === 'club') return 'Paiement au club';
    return '-';
  }

  private renderClient(row: CommandeDTO): string {
    const fullName = this.escapeHtml(`${row.utilisateurPrenom} ${row.utilisateurNom}`.trim() || 'Client');
    const email = this.escapeHtml(row.utilisateurEmail || '');
    return `<div class="table-client"><strong>${fullName}</strong><span>${email}</span></div>`;
  }

  private renderBeneficiaires(row: CommandeDTO): string {
    const beneficiaires = this.beneficiaires(row);

    if (!beneficiaires.length) {
      return `<span class="table-muted">-</span>`;
    }

    return `<div class="table-chips">${beneficiaires
      .map((name) => `<span class="table-chip">${this.escapeHtml(name)}</span>`)
      .join('')}</div>`;
  }

  private renderStatut(statut: CommandeDTO['statut']): string {
    const normalized = this.normalize(statut);
    let badgeClass = 'table-badge';

    if (normalized === 'paye') badgeClass += ' table-badge--success';
    else if (normalized === 'en attente') badgeClass += ' table-badge--warning';
    else if (normalized === 'retire') badgeClass += ' table-badge--neutral';
    else if (normalized === 'annule') badgeClass += ' table-badge--danger';

    return `<span class="${badgeClass}">${this.escapeHtml(statut || '-')}</span>`;
  }

  private renderProduit(ligne: LigneCommandeDTO): string {
    return `<div class="table-product"><strong>${this.escapeHtml(ligne.produitNom)}</strong><span>ID: ${ligne.produitId}</span></div>`;
  }

  private renderOptions(ligne: LigneCommandeDTO): string {
    const chips: string[] = [];

    if (ligne.taille) chips.push(`Taille: ${this.escapeHtml(ligne.taille)}`);
    if (ligne.couleur) chips.push(`Couleur: ${this.escapeHtml(ligne.couleur)}`);

    const beneficiaire = `${ligne.beneficiairePrenom ?? ''} ${ligne.beneficiaireNom ?? ''}`.trim();
    if (beneficiaire) chips.push(`Pour: ${this.escapeHtml(beneficiaire)}`);

    if (!chips.length) {
      return `<span class="table-muted">-</span>`;
    }

    return `<div class="table-chips">${chips.map((chip) => `<span class="table-chip">${chip}</span>`).join('')}</div>`;
  }

  private beneficiaires(commande: { lignes?: Array<{ beneficiairePrenom?: string | null; beneficiaireNom?: string | null }> }): string[] {
    const set = new Set<string>();

    for (const ligne of commande?.lignes ?? []) {
      const fullName = `${ligne.beneficiairePrenom ?? ''} ${ligne.beneficiaireNom ?? ''}`.trim();
      if (fullName) {
        set.add(fullName);
      }
    }

    return Array.from(set);
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
