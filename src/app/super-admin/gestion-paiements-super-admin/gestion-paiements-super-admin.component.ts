import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiTableComponent, UiTableColumn } from '../../shared/components/ui-table/ui-table.component';
import { AjoutPaiementComponent } from '../../admin/gestion-paiements/ajout-paiement/ajout-paiement.component';
import { SuperAdminPaiementService } from '../../services/super-admin-paiement.service';
import { ClubService, Club } from '../../services/club.service';

@Component({
  selector: 'app-gestion-paiements-super-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, UiTableComponent, AjoutPaiementComponent],
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
    dateDebut: '',
    dateFin: '',
    statut: 'all',
    type: 'all'
  };
  ongletActif: 'paiements' | 'echeances' = 'paiements';
  modalPaiementVisible = false;
  paiementSelectionne: any = null;
  statutOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'payé', label: 'Payé' },
    { value: 'remboursé', label: 'Remboursé' },
    { value: 'en attente', label: 'En attente' }
  ];
  typeOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'cotisation', label: 'Cotisation' },
    { value: 'licence', label: 'Licence' },
    { value: 'autre', label: 'Autre' }
  ];
  // Colonnes pour ui-table
  tableColumns: UiTableColumn[] = [
    { key: 'club', label: 'Club', type: 'text' },
    { key: 'datePaiement', label: 'Date', type: 'date', display: (row: any) => this.formatDate(row.datePaiement) },
    { key: 'utilisateur', label: 'Payé par', type: 'text', display: (row: any) => `${row.utilisateurPrenom} ${row.utilisateurNom}` },
    { key: 'membre', label: 'Pour', type: 'text', display: (row: any) => `${row.membrePrenom} ${row.membreNom}` },
    { key: 'type', label: 'Type de paiement', type: 'text', display: (row: any) => `${row.type} – ${row.modePaiement}` },
    { key: 'montantTotal', label: 'Total', type: 'number', cellClass: 'num', display: (row: any) => this.formatCurrency(row.montantTotal) },
    { key: 'statut', label: 'Statut', type: 'text', display: (row: any) => this.getBadge(row.statut) }
  ];
  tableActions = [
    { label: 'Voir', icon: 'ri-eye-line', action: 'details', variant: 'ghost' as const, title: 'Détail paiement' }
  ];
  // TrackBy pour ui-table (optionnel)
  trackByPaiement(index: number, p: any) {
    return p && p.id ? p.id : index;
  }
  // Modale ajout paiement
  modalAjoutVisible = false;
  ouvrirAjoutPaiement() {
    this.modalAjoutVisible = true;
  }
  fermerModalAjout() {
    this.modalAjoutVisible = false;
  }
  onPaiementAjoute() {
    this.modalAjoutVisible = false;
    // Rafraîchir la liste après ajout
    this.paiementService.getAllPaiements().subscribe(res => {
      this.paiements = Array.isArray(res) ? res : [];
      this.applyFilters();
    });
  }
  // Action du tableau (voir détail)
  onAction(event: { action: string, row: any }) {
    if (event.action === 'details') {
      this.ouvrirDetailsPaiement(event.row);
    }
  }
  getClubLogo(clubId: number): string | null {
    const club = this.clubs.find((c: any) => c.id === clubId);
    if (!club) return null;
    return (club as any).logoUrl || (club as any).logo || null;
  }
  constructor(
    private paiementService: SuperAdminPaiementService,
    private clubService: ClubService
  ) {}
  ngOnInit(): void {
    this.clubService.getClubs().subscribe(clubs => {
      this.clubs = clubs;
    });
    this.paiementService.getAllPaiements().subscribe(res => {
      this.paiements = Array.isArray(res) ? res : [];
      this.applyFilters();
    });
  }
  onClubChange() {
    this.applyFilters();
  }
  changerOnglet(onglet: 'paiements' | 'echeances') {
    this.ongletActif = onglet;
  }
  applyFilters() {
    let data = this.paiements;
    if (this.selectedClubId !== 'all') {
      data = data.filter(p => p.clubId === this.selectedClubId);
    }
    if (this.filter.dateDebut) {
      const d1 = new Date(this.filter.dateDebut);
      data = data.filter(p => new Date(p.datePaiement) >= d1);
    }
    if (this.filter.dateFin) {
      const d2 = new Date(this.filter.dateFin);
      data = data.filter(p => new Date(p.datePaiement) <= d2);
    }
    if (this.filter.statut !== 'all') {
      data = data.filter(p => p.statut && p.statut.toLowerCase().includes(this.filter.statut));
    }
    if (this.filter.type !== 'all') {
      data = data.filter(p => p.type && p.type.toLowerCase().includes(this.filter.type));
    }
    this.filteredPaiements = data;
    this.computeStats();
  }
  computeStats() {
    const paiements = this.filteredPaiements;
    this.stats.count = paiements.length;
    this.stats.total = paiements.reduce((sum, p) => sum + (p.montantTotal || 0), 0);
    this.stats.rembourses = paiements.filter(p => p.statut && p.statut.toLowerCase().includes('rembours')).length;
    this.stats.enAttente = paiements.filter(p => p.statut && p.statut.toLowerCase().includes('attente')).length;
  }
  ouvrirDetailsPaiement(p: any) {
    this.paiementSelectionne = p;
    this.modalPaiementVisible = true;
  }
  fermerModalPaiement() {
    this.modalPaiementVisible = false;
    this.paiementSelectionne = null;
  }
  getBadge(statut: string) {
    if (!statut) return '';
    const s = statut.toLowerCase();
    if (s.includes('payé')) return '<span class="badge badge-success">Payé</span>';
    if (s.includes('attente')) return '<span class="badge badge-warning">En attente</span>';
    if (s.includes('rembours')) return '<span class="badge badge-info">Remboursé</span>';
    if (s.includes('annul')) return '<span class="badge badge-danger">Annulé</span>';
    return '<span class="badge">' + statut + '</span>';
  }
  formatDate(date: string | Date): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR');
  }
  formatCurrency(val: number): string {
    if (val == null) return '';
    return val.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  }
  exportCSV() {
    const rows = this.filteredPaiements;
    if (!rows.length) return;
    const header = ['Club','Date','Payé par','Pour','Type de paiement','Total','Statut'];
    const data = rows.map((row: any) => [
      row.club,
      this.formatDate(row.datePaiement),
      `${row.utilisateurPrenom} ${row.utilisateurNom}`,
      `${row.membrePrenom} ${row.membreNom}`,
      `${row.type} – ${row.modePaiement}`,
      row.montantTotal,
      row.statut
    ].join(';')).join('\n');
    const csv = header.join(';') + '\n' + data;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'paiements-clubs.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
