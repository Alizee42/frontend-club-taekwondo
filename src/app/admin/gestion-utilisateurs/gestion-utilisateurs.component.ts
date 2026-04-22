import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { UiTableComponent, UiTableColumn } from '../../shared/components/ui-table/ui-table.component';
import { UiModalComponent } from '../../shared/ui/modal/ui-modal.component';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';
import { FormsModule } from '@angular/forms';
import { ClubService } from '../../services/club.service';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';

@Component({
  selector: 'app-gestion-utilisateurs',
  standalone: true,
  imports: [CommonModule, UiTableComponent, UiModalComponent, UiButtonComponent, FormsModule, PageHeaderComponent],
  templateUrl: './gestion-utilisateurs.component.html',
  styleUrls: ['./gestion-utilisateurs.component.css']
})
export class GestionUtilisateursComponent implements OnInit {
  utilisateurs: any[] = [];
  clubId: number | null = null;
  columns: UiTableColumn[] = [
    { key: 'prenom', label: 'Prénom' },
    { key: 'nom', label: 'Nom' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Rôle' }
  ];
  actions = [
    { label: 'Éditer', icon: 'ri-edit-2-line', action: 'edit', color: '#1976d2' },
    { label: 'Supprimer', icon: 'ri-delete-bin-6-line', action: 'delete', color: '#d32f2f' }
  ];

  modalOpen = false;
  modalTitle = '';
  utilisateurEdit: any = null;

  constructor(private http: HttpClient, private clubService: ClubService) {}

  ngOnInit(): void {
    this.clubId = this.clubService.getSelectedClub()?.id ?? null;
    this.chargerUtilisateursClub();
  }

  chargerUtilisateursClub(): void {
    if (this.clubId) {
      this.http.get<any[]>(`${environment.apiUrl}/utilisateurs?clubId=${this.clubId}`).subscribe({
        next: (data) => this.utilisateurs = data,
        error: () => this.utilisateurs = []
      });
    }
  }
  onActionClick(event: { action: string; row: any }) {
    if (event.action === 'edit') {
      this.modalTitle = 'Modifier l’utilisateur';
      this.utilisateurEdit = { ...event.row };
      this.modalOpen = true;
    }
    if (event.action === 'delete') {
      // ouvrir confirmation suppression
    }
  }

  openAddModal() {
    this.modalTitle = 'Ajouter un utilisateur';
    this.utilisateurEdit = { prenom: '', nom: '', email: '', role: '' };
    this.modalOpen = true;
  }

  closeModal() {
    this.modalOpen = false;
    this.utilisateurEdit = null;
  }
}
