import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgFor, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommandeService, CommandeDTO } from '../../services/commande.service';
import { AuthService } from '../../services/auth.service';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { UiModalComponent } from '../../shared/ui/modal/ui-modal.component';
import { UiTableColumn, UiTableComponent } from '../../shared/components/ui-table/ui-table.component';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';

@Component({
  selector: 'app-commandes-membre',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgIf, NgFor,
    CurrencyPipe,
    PageHeaderComponent,
    UiModalComponent,
    UiTableComponent,
    UiButtonComponent
  ],
  templateUrl: './commandes-membre.component.html',
  styleUrls: ['./commandes-membre.component.css']
})
export class CommandesMembreComponent implements OnInit {

  commandes: CommandeDTO[] = [];
  isLoading = false;
  errorMsg = '';
  search = '';
  columns: UiTableColumn[] = [
    {
      key: 'dateCommande',
      label: 'Date',
      type: 'date',
      width: '130px',
      display: (row: CommandeDTO) => this.formatDate(row.dateCommande)
    },
    {
      key: 'parent',
      label: 'Parent',
      display: (row: CommandeDTO) => `${row.utilisateurPrenom ?? ''} ${row.utilisateurNom ?? ''}`.trim() || '-'
    },
    {
      key: 'modePaiement',
      label: 'Mode',
      width: '170px',
      display: (row: CommandeDTO) => this.normalizeModePaiement(row.modePaiement)
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
      cellClass: 'td-center',
      headerClass: 'th-center',
      render: (row: CommandeDTO) => this.renderStatut(row.statut)
    }
  ];
  actions = [
    {
      label: 'Voir les details',
      icon: 'ri-eye-line',
      action: 'details',
      variant: 'ghost' as const,
      title: 'Voir le detail de la commande'
    }
  ];

  constructor(private commandeService: CommandeService, private authService: AuthService) {}

  private getCurrentMembreId(): number | null {
    const membreId = this.authService.getMembreIdFromToken() ?? this.authService.getUserIdFromToken();
    return membreId && membreId > 0 ? membreId : null;
  }

  /** =========================
   *   Cycle de vie
   * ========================= */
  ngOnInit(): void {
    this.chargerCommandes();
  }

  /** =========================
   *   Chargement des commandes
   * ========================= */
  chargerCommandes(): void {
    this.isLoading = true;
    this.errorMsg = '';

    const mid = this.getCurrentMembreId();
    if (!mid) {
      this.errorMsg = 'Membre non identifié.';
      this.isLoading = false;
      return;
    }

    this.commandeService.getCommandesMembre(mid).subscribe({
      next: (list) => {
        this.commandes = list
          .sort((a, b) =>
            new Date(b.dateCommande).getTime() - new Date(a.dateCommande).getTime()
          );
        this.isLoading = false;
      },
      error: (err) => {
        console.error('[Commandes Membre] erreur API', err);
        this.errorMsg = 'Impossible de charger vos commandes.';
        this.isLoading = false;
      }
    });
  }

  /** =========================
   *   UI Helpers
   * ========================= */
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

  // Détails commande
  commandeSelectionnee: CommandeDTO | null = null;
  voirDetails(c: CommandeDTO) { this.commandeSelectionnee = c; }
  fermerDetails() { this.commandeSelectionnee = null; }

  get commandesFiltrees(): CommandeDTO[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.commandes;
    return this.commandes.filter((commande) => {
      const haystack = [
        commande.id,
        commande.dateCommande,
        commande.utilisateurPrenom,
        commande.utilisateurNom,
        commande.modePaiement,
        commande.statut,
        this.articlesResume(commande)
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }

  onTableAction(event: { action: string; row: CommandeDTO }): void {
    if (event.action === 'details') {
      this.voirDetails(event.row);
    }
  }

  classeBadgeCommande(statut: string): string {
    const s = (statut || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    if (s.includes('paye')) return 'badge badge-success';
    if (s.includes('attente')) return 'badge badge-warning';
    if (s.includes('retire')) return 'badge badge-secondary';
    if (s.includes('annule')) return 'badge badge-danger';
    return 'badge badge-dark';
  }

  normalizeModePaiement(mode: string): string {
    if (!mode) return '-';
    const m = mode.toUpperCase();
    switch (m) {
      case 'CB':
      case 'CARTE_BANCAIRE':
      case 'STRIPE':
        return 'CB';
      case 'CLUB':
      case 'PAIEMENT_CLUB':
        return 'Paiement au club';
      case 'CASH':
        return 'Especes';
      case 'CHEQUE':
        return 'Cheque';
      case 'VIREMENT':
        return 'Virement';
      default:
        return mode;
    }
  }

  private formatDate(value: string): string {
    if (!value) return '-';
    return new Intl.DateTimeFormat('fr-FR').format(new Date(value));
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(value) || 0);
  }

  private renderStatut(statut: string): string {
    const label = statut || '-';
    return `<span class="${this.classeBadgeCommande(label)}">${label}</span>`;
  }
}
