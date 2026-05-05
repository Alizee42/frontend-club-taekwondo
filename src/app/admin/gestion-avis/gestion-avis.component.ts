import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiTableColumn, UiTableComponent } from '../../shared/components/ui-table/ui-table.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { KpiCardComponent } from '../../shared/ui/kpi-card/kpi-card.component';
import { KpiGridComponent } from '../../shared/ui/kpi-grid/kpi-grid.component';
import { AvisService, Avis } from '../../services/avis.service';
import { ClubService, Club } from '../../services/club.service';

@Component({
  selector: 'app-gestion-avis',
  templateUrl: './gestion-avis.component.html',
  styleUrls: ['./gestion-avis.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, UiTableComponent, PageHeaderComponent, KpiCardComponent, KpiGridComponent],
})
export class GestionAvisComponent implements OnInit {
  avis: Avis[] = [];
  searchTerm = '';
  approvalFilter: '' | 'approved' | 'pending' = '';
  columns: UiTableColumn[] = [
    { key: 'pseudoVisiteur', label: 'Nom' },
    { key: 'contenu', label: 'Contenu' },
    { key: 'note', label: 'Note' },
    { key: 'typeAvis', label: 'Sujet' },
    {
      key: 'approuve',
      label: 'Statut',
      display: (row: Avis) => this.isAvisApproved(row) ? 'Approuve' : 'En attente',
      textClass: (row: Avis) => this.isAvisApproved(row)
        ? 'status-badge status--success'
        : 'status-badge status--warning'
    }
  ];
  actions = [
    { label: 'Approuver', icon: 'ri-check-line', action: 'approve', color: '#16a34a', variant: 'primary' as const, show: (r: any) => !this.isAvisApproved(r) },
    { label: 'Refuser', icon: 'ri-close-line', action: 'refuse', color: '#d32f2f', variant: 'danger' as const }
  ];
  selectedClub: Club | null = null;

  get nbAvis()      { return this.avis.length; }
  get nbApprouves() { return this.avis.filter(a => this.isAvisApproved(a)).length; }
  get nbEnAttente() { return this.avis.filter(a => !this.isAvisApproved(a)).length; }
  get noteMoyenne() {
    if (!this.avis.length) return '-';
    return (this.avis.reduce((s, a) => s + (a.note || 0), 0) / this.avis.length).toFixed(1) + ' / 5';
  }

  constructor(private avisService: AvisService, private clubService: ClubService) {}

  ngOnInit(): void {
    this.selectedClub = this.clubService.getSelectedClub();
    if (this.selectedClub && this.selectedClub.id) {
      this.avisService.getAvisParClub(this.selectedClub.id).subscribe(data => {
        this.avis = data || [];
      });
    } else {
      this.avis = [];
    }
  }

  filteredAvis(): Avis[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.avis.filter((avis) => {
      const matchesSearch = !term || [
        avis.pseudoVisiteur,
        avis.contenu,
        avis.typeAvis ?? ''
      ].some((value) => String(value || '').toLowerCase().includes(term));

      const matchesApproval = !this.approvalFilter
        || (this.approvalFilter === 'approved' && this.isAvisApproved(avis))
        || (this.approvalFilter === 'pending' && !this.isAvisApproved(avis));

      return matchesSearch && matchesApproval;
    });
  }

  onTableAction(event: { action: string, row: Avis }) {
    const id = Number(event.row.id);
    if (event.action === 'approve' && !isNaN(id)) {
      this.avisService.approuverAvis(id).subscribe(() => {
        this.avis = this.avis.map(a => a.id === id ? { ...a, approuve: true } : a);
      });
    } else if (event.action === 'refuse' && !isNaN(id)) {
      this.avisService.deleteAvis(id).subscribe(() => {
        this.avis = this.avis.filter(a => a.id !== id);
      });
    }
  }

  private isAvisApproved(avis: Avis | null | undefined): boolean {
    const value = (avis as any)?.approuve;
    return value === true || String(value).toLowerCase() === 'true';
  }
}
