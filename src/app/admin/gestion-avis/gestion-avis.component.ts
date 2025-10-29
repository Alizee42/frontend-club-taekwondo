import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiTableComponent } from '../../shared/components/ui-table/ui-table.component';
import { UiTitleComponent } from '../../ui/ui-title/ui-title.component';
import { AvisService, Avis } from '../../services/avis.service';
import { ClubService, Club } from '../../services/club.service';

@Component({
  selector: 'app-gestion-avis',
  templateUrl: './gestion-avis.component.html',
  styleUrls: ['./gestion-avis.component.css'],
  standalone: true,
  imports: [CommonModule, UiTableComponent, UiTitleComponent],
})
export class GestionAvisComponent implements OnInit {
  avis: Avis[] = [];
  columns = [
    { key: 'pseudoVisiteur', label: 'Nom' },
    { key: 'contenu', label: 'Contenu' },
    { key: 'note', label: 'Note' },
    { key: 'typeAvis', label: 'Sujet' },
    { key: 'approuve', label: 'Approuvé', render: (row: any) => {
        if (row == null || row.approuve == null) return 'En attente';
        return row.approuve ? 'Oui' : 'Non';
      }
    }
  ];
  actions = [
    { label: 'Approuver', icon: 'ri-check-line', action: 'approve', color: '#16a34a', variant: "primary" as const, show: (r: any) => !r?.approuve },
    { label: 'Refuser', icon: 'ri-close-line', action: 'refuse', color: '#d32f2f', variant: "danger" as const }
  ];
  selectedClub: Club | null = null;

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
}
