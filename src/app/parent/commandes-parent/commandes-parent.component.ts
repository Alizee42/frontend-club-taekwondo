import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommandeService, CommandeDTO } from '../../services/commande.service';
import { AuthService } from '../../services/auth.service';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { UiModalComponent } from '../../shared/ui/modal/ui-modal.component';
import { UiTableColumn, UiTableComponent } from '../../shared/components/ui-table/ui-table.component';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';

@Component({
  selector: 'app-commandes-parent',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, PageHeaderComponent, UiModalComponent, UiTableComponent, UiButtonComponent],
  templateUrl: './commandes-parent.component.html',
  styleUrls: ['./commandes-parent.component.css']
})
export class CommandesParentComponent implements OnInit {

  commandes: CommandeDTO[] = [];
  isLoading = false;
  errorMsg = '';
  search = '';
  columns: UiTableColumn[] = [
    {
      key: 'dateCommande',
      label: 'Date',
      width: '130px',
      display: (row: CommandeDTO) => this.formatDate(row.dateCommande)
    },
    {
      key: 'beneficiaires',
      label: 'Membre(s)',
      render: (row: CommandeDTO) => this.renderBeneficiaires(row)
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

  constructor(
    private commandeService: CommandeService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.chargerCommandes();
  }

  /** =========================
   *   ID utilisateur
   * ========================= */
  private getCurrentUserId(): number | null {
    const utilisateurId =
      this.authService.getUtilisateurConnecte()?.id ??
      this.authService.getUserIdFromToken();

    if (utilisateurId && utilisateurId > 0) {
      return utilisateurId;
    }

    console.warn('[CommandesParent] Aucun utilisateurId valide trouve');
    return null;
  }

  /** =========================
   *   Chargement des commandes
   * ========================= */
  chargerCommandes(): void {
    this.isLoading = true;
    this.errorMsg = '';

    const parentId = this.getCurrentUserId();
    if (!parentId) {
      this.errorMsg = 'Utilisateur non identifie.';
      this.isLoading = false;
      return;
    }

    this.commandeService.getCommandesParent(parentId).subscribe({
      next: (list) => {
        this.commandes = list
          .sort((a, b) =>
            new Date(b.dateCommande).getTime() - new Date(a.dateCommande).getTime()
          );
        this.isLoading = false;
      },
      error: (err) => {
        console.error('[Commandes Parent] erreur API', err);
        this.errorMsg = 'Impossible de charger vos commandes.';
        this.isLoading = false;
      }
    });
  }

  /** =========================
   *   UI Helpers
   * ========================= */
  beneficiaires(c: CommandeDTO): string[] {
    const set = new Set<string>();
    for (const l of (c?.lignes ?? [])) {
      const full = `${l.beneficiairePrenom ?? ''} ${l.beneficiaireNom ?? ''}`.trim();
      if (full) set.add(full);
    }
    const names = Array.from(set);
    if (names.length) return names;

    const utilisateur = `${c?.utilisateurPrenom ?? c?.utilisateur?.prenom ?? ''} ${c?.utilisateurNom ?? c?.utilisateur?.nom ?? ''}`.trim();
    return utilisateur ? [utilisateur] : [];
  }

  articlesResume(c: CommandeDTO): string {
    const lignes = c?.lignes ?? [];
    if (!lignes.length) return '-';
    const count = lignes.reduce((sum, l) => sum + (Number(l.quantite) || 0), 0);
    const noms = Array.from(new Set(lignes.map(l => l.produitNom || 'Produit').filter(Boolean)));
    const preview = noms.slice(0, 2).join(', ');
    const more = noms.length > 2 ? ` (+${noms.length - 2})` : '';
    return `${count} article${count > 1 ? 's' : ''} - ${preview}${more}`;
  }

  trackByCommande = (_: number, c: CommandeDTO) => c.id;
  trackByMembre = (_: number, m: string) => m;

  // Details
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
        commande.modePaiement,
        commande.statut,
        this.beneficiaires(commande).join(' '),
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

  // Methode pour normaliser l'affichage du mode de paiement
  normalizeModePaiement(mode: string): string {
    if (!mode) return '-';
    const m = mode.toUpperCase();
    switch (m) {
      case 'CB':
      case 'STRIPE':
        return 'CB';
      case 'CLUB':
        return 'Paiement au club';
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
    const label = this.formatStatut(statut);
    return `<span class="${this.classeBadgeCommande(label)}">${label}</span>`;
  }

  private formatStatut(statut: string): string {
    const normalized = (statut || '').trim().toUpperCase();
    switch (normalized) {
      case 'EN_ATTENTE':
        return 'En attente';
      case 'PAYEE':
      case 'PAYE':
        return 'Payée';
      case 'A_RETIRER':
        return 'À retirer';
      case 'ANNULEE':
      case 'ANNULE':
        return 'Annulée';
      default:
        return statut ? statut.replace(/_/g, ' ') : '-';
    }
  }

  private renderBeneficiaires(commande: CommandeDTO): string {
    const noms = this.beneficiaires(commande);
    if (!noms.length) return '<span class="muted">-</span>';
    return `<div class="chips">${noms.map((nom) => `<span class="chip">${this.escapeHtml(nom)}</span>`).join('')}</div>`;
  }

  private escapeHtml(value: string): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
