import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SuiviPaiementsComponent } from '../../shared/components/suivi-paiements/suivi-paiements.component';
import { Club, ClubService } from '../../services/club.service';
import { SuperAdminPaiementService } from '../../services/super-admin-paiement.service';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';
import { UiModalComponent } from '../../shared/ui/modal/ui-modal.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { AjoutPaiementComponent } from '../../admin/gestion-paiements/ajout-paiement/ajout-paiement.component';

@Component({
  selector: 'app-gestion-paiements-super-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SuiviPaiementsComponent,
    UiButtonComponent,
    UiModalComponent,
    PageHeaderComponent,
    AjoutPaiementComponent
  ],
  templateUrl: './gestion-paiements-super-admin.component.html',
  styleUrls: ['./gestion-paiements-super-admin.component.css']
})
export class GestionPaiementsSuperAdminComponent implements OnInit {
  clubs: Club[] = [];
  selectedClubId: number | 'all' = 'all';
  paiements: any[] = [];
  filteredPaiements: any[] = [];

  stats = {
    total: 0,
    count: 0,
    rembourses: 0,
    enAttente: 0
  };

  filter = {
    q: '',
    statut: 'all',
    mode: 'all'
  };

  viewMode: 'paiements' | 'utilisateurs' = 'paiements';
  groupByParentLocal = false;

  modalAjoutVisible = false;
  modalPaiementVisible = false;
  paiementSelectionne: any = null;

  constructor(
    private paiementService: SuperAdminPaiementService,
    private clubService: ClubService
  ) {}

  ngOnInit(): void {
    this.clubService.getClubs().subscribe((clubs) => {
      this.clubs = clubs || [];
    });

    this.refresh();
  }

  get totalClubs(): number {
    if (this.selectedClubId === 'all') {
      return this.clubs.length;
    }

    return this.filteredPaiements.reduce((setSize, paiement, index, array) => {
      const currentSet = new Set(array.slice(0, index + 1).map((row: any) => Number(row.clubId)).filter((id) => !Number.isNaN(id)));
      return currentSet.size;
    }, 0);
  }

  ouvrirAjoutPaiement(): void {
    this.modalAjoutVisible = true;
  }

  fermerModalAjout(): void {
    this.modalAjoutVisible = false;
  }

  onPaiementAjoute(): void {
    this.fermerModalAjout();
    this.refresh();
  }

  onClubChange(): void {
    this.applyFilters();
  }

  refresh(): void {
    this.paiementService.getAllPaiements().subscribe({
      next: (res) => {
        this.paiements = Array.isArray(res) ? res : [];
        this.computeLocalMontants(this.paiements);
        this.applyFilters();
      },
      error: () => {
        this.paiements = [];
        this.filteredPaiements = [];
        this.computeStats();
      }
    });
  }

  resetFilters(): void {
    this.filter = {
      q: '',
      statut: 'all',
      mode: 'all'
    };
    this.groupByParentLocal = false;
    this.viewMode = 'paiements';
    this.applyFilters();
  }

  applyFilters(): void {
    const query = (this.filter.q || '').trim().toLowerCase();
    const statut = this.normalize(this.filter.statut);
    const mode = this.normalize(this.filter.mode);

    let data = [...this.paiements];

    if (this.selectedClubId !== 'all') {
      data = data.filter((paiement) => Number(paiement.clubId) === Number(this.selectedClubId));
    }

    if (query) {
      data = data.filter((paiement) => {
        const haystack = [
          paiement.club,
          paiement.clubNom,
          paiement.clubName,
          paiement.utilisateurPrenom,
          paiement.utilisateurNom,
          paiement.utilisateurEmail,
          paiement.membrePrenom,
          paiement.membreNom,
          paiement.type,
          paiement.modePaiement
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(query);
      });
    }

    if (statut !== 'all') {
      data = data.filter((paiement) => this.normalize(paiement.statut).includes(statut));
    }

    if (mode !== 'all') {
      data = data.filter((paiement) => this.normalize(this.libelleMode(paiement.modePaiement)).includes(mode));
    }

    this.filteredPaiements = data.sort((a, b) => {
      const dateA = a.datePaiement ? new Date(a.datePaiement).getTime() : 0;
      const dateB = b.datePaiement ? new Date(b.datePaiement).getTime() : 0;
      return dateB - dateA;
    });

    this.computeStats();
  }

  computeStats(): void {
    const paiements = this.filteredPaiements;
    this.stats.count = paiements.length;
    this.stats.total = paiements.reduce((sum, paiement) => sum + (Number(paiement.montantTotal) || 0), 0);
    this.stats.rembourses = paiements.filter((paiement) => this.normalize(paiement.statut).includes('rembours')).length;
    this.stats.enAttente = paiements.filter((paiement) => this.normalize(paiement.statut).includes('attente')).length;
  }

  ouvrirDetailsPaiement(paiement: any): void {
    this.paiementSelectionne = paiement;
    this.modalPaiementVisible = true;
  }

  fermerModalPaiement(): void {
    this.modalPaiementVisible = false;
    this.paiementSelectionne = null;
  }

  exportCSV(): void {
    if (!this.filteredPaiements.length) {
      return;
    }

    const header = ['Club', 'Date', 'Paye par', 'Pour', 'Type', 'Mode', 'Montant', 'Statut'];
    const rows = this.filteredPaiements.map((paiement: any) => [
      this.getClubName(paiement),
      this.formatDate(paiement.datePaiement),
      `${paiement.utilisateurPrenom || ''} ${paiement.utilisateurNom || ''}`.trim(),
      `${paiement.membrePrenom || ''} ${paiement.membreNom || ''}`.trim(),
      this.libelleType(paiement.type, paiement.echeances),
      this.libelleMode(paiement.modePaiement),
      Number(paiement.montantTotal || 0),
      paiement.statut || ''
    ]);

    const csv = [header, ...rows].map((row) => row.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'super-admin-paiements.csv';
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  getClubName(paiement: any): string {
    if (!paiement) {
      return '';
    }

    if (paiement.club || paiement.clubNom || paiement.clubName) {
      return paiement.club || paiement.clubNom || paiement.clubName;
    }

    const club = this.clubs.find((item) => Number(item.id) === Number(paiement.clubId));
    return club?.nom || '';
  }

  getBadgeLabel(statut?: string): string {
    const normalized = this.normalize(statut);
    if (normalized.includes('paye')) {
      return 'Paye';
    }
    if (normalized.includes('rembours')) {
      return 'Rembourse';
    }
    if (normalized.includes('annul')) {
      return 'Annule';
    }
    if (normalized.includes('retard')) {
      return 'En retard';
    }
    return 'En attente';
  }

  getBadgeClass(statut?: string): string {
    const normalized = this.normalize(statut);
    if (normalized.includes('paye')) {
      return 'status-chip status-chip--success';
    }
    if (normalized.includes('rembours')) {
      return 'status-chip status-chip--info';
    }
    if (normalized.includes('annul')) {
      return 'status-chip status-chip--neutral';
    }
    if (normalized.includes('retard')) {
      return 'status-chip status-chip--danger';
    }
    return 'status-chip status-chip--warning';
  }

  libelleType(type?: string, echeances?: { id?: number }[] | undefined): string {
    const normalized = this.normalize(type);
    if (normalized.includes('echel') || normalized.includes('echeanc')) {
      return 'Echelonne';
    }
    if (Array.isArray(echeances) && echeances.length > 0) {
      return 'Echelonne';
    }
    return 'Unique';
  }

  libelleMode(mode?: string): string {
    const normalized = this.normalize(mode);
    if (!normalized) {
      return '-';
    }
    if (normalized.includes('cb') || normalized.includes('stripe') || normalized.includes('carte')) {
      return 'CB';
    }
    if (normalized.includes('virement') || normalized.includes('vir')) {
      return 'Virement';
    }
    if (normalized.includes('espec') || normalized.includes('espece') || normalized.includes('espace')) {
      return 'Especes';
    }
    if (normalized.includes('cheq')) {
      return 'Cheque';
    }
    return 'Autre';
  }

  formatDate(date: string | Date): string {
    if (!date) {
      return '';
    }

    return new Date(date).toLocaleDateString('fr-FR');
  }

  formatCurrency(value: number): string {
    if (value == null) {
      return '';
    }

    return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  }

  private computeLocalMontants(list: any[]): void {
    if (!Array.isArray(list)) {
      return;
    }

    list.forEach((paiement: any) => {
      if (Array.isArray(paiement.echeances) && paiement.echeances.length) {
        paiement.montantPaye = paiement.echeances.reduce((sum: number, echeance: any) => {
          const statut = this.normalize(echeance?.statut);
          return statut === 'paye' ? sum + (Number(echeance?.montant) || 0) : sum;
        }, 0);
      } else {
        paiement.montantPaye = this.normalize(paiement.statut) === 'paye' ? Number(paiement.montantTotal) || 0 : 0;
      }

      paiement.montantRestant = Math.max(
        0,
        (Number(paiement.montantTotal) || 0) - (Number(paiement.montantPaye) || 0)
      );
    });
  }

  private normalize(value: any): string {
    return String(value || '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim();
  }
}
