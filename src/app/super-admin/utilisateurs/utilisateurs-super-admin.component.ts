import { Component, OnInit } from '@angular/core';
import { UtilisateurService } from '../../services/utilisateur.service';
import { ClubService, Club } from '../../services/club.service';
import { CommonModule } from '@angular/common';
import { UtilisateurFormComponent } from './utilisateur-form.component';
import { UiTableComponent } from '../../shared/components/ui-table/ui-table.component';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';
import { UiModalComponent } from '../../shared/ui/modal/ui-modal.component';
import { UiTitleComponent } from '../../shared/ui/title/ui-title.component';

@Component({
  selector: 'app-utilisateurs-super-admin',
  standalone: true,
  imports: [CommonModule, UtilisateurFormComponent, UiTableComponent, UiButtonComponent, UiModalComponent, UiTitleComponent],
  templateUrl: './utilisateurs-super-admin.component.html',
  styleUrls: ['./utilisateurs-super-admin.component.css']
})
export class UtilisateursSuperAdminComponent implements OnInit {
  columns = [
    { key: 'nom', label: 'Nom' },
    { key: 'prenom', label: 'Prénom' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Rôle' },
    { key: 'club', label: 'Club', render: (row: any) => row.clubName || '' }
  ];

  actions = [
    { label: 'Éditer', icon: 'ri-edit-2-line', action: 'edit', color: '#2563eb' },
    { label: 'Supprimer', icon: 'ri-delete-bin-6-line', action: 'delete', color: '#e53935' }
  ];

  onTableAction(event: { action: string; row: any }) {
    if (event.action === 'edit') this.onEditUtilisateur(event.row);
    if (event.action === 'delete') this.onDeleteUtilisateur(event.row);
  }
  utilisateurs: any[] = [];
  clubs: Club[] = [];

  showModal = false;
  mode: 'ajout' | 'edition' = 'ajout';
  utilisateurEnCours: any = {};

  constructor(private utilisateurService: UtilisateurService, private clubService: ClubService) {}

  ngOnInit(): void {
    // Charger les clubs puis les utilisateurs
    this.clubService.getClubs().subscribe({
      next: (clubs) => {
        this.clubs = clubs;
        this.utilisateurService.getAll().subscribe({
          next: (users) => {
            // Mapper clubId -> nom du club
            this.utilisateurs = users.map(u => ({
              ...u,
              clubName: u.clubId ? (clubs.find(c => c.id === u.clubId)?.nom || clubs.find(c => c.id === u.clubId)?.name || u.clubId) : ''
            }));
          },
          error: () => {}
        });
      },
      error: () => {
        // Si erreur clubs, charger quand même les utilisateurs
        this.utilisateurService.getAll().subscribe({
          next: (users) => { this.utilisateurs = users; },
          error: () => {}
        });
      }
    });
  }

  onAddUtilisateur() {
    this.mode = 'ajout';
    this.utilisateurEnCours = {};
    this.showModal = true;
  }

  onEditUtilisateur(utilisateur: any) {
  this.mode = 'edition';
  // Pré-remplir clubId pour le select et s'assurer que l'id est bien présent
  this.utilisateurEnCours = { ...utilisateur, id: utilisateur.id, clubId: utilisateur.clubId || '' };
  this.showModal = true;
  }

  onDeleteUtilisateur(utilisateur: any) {
    if (!utilisateur.id) return;
    if (confirm('Voulez-vous vraiment supprimer cet utilisateur ?')) {
      this.utilisateurService.delete(utilisateur.id).subscribe({
        next: () => this.reloadUtilisateurs(),
        error: () => {/* Optionnel: afficher une erreur */}
      });
    }
  }

  onSubmitForm(utilisateur: any) {
    // Filtrer clubName du payload avant envoi
    const utilisateurPayload = { ...utilisateur };
    delete utilisateurPayload.clubName;
    if (this.mode === 'ajout') {
      this.utilisateurService.add(utilisateurPayload).subscribe({
        next: () => this.reloadUtilisateurs(),
        error: () => {/* Optionnel: afficher une erreur */},
        complete: () => { this.showModal = false; }
      });
    } else {
      // S'assurer que l'id est bien transmis
      if (!utilisateurPayload.id && this.utilisateurEnCours.id) {
        utilisateurPayload.id = this.utilisateurEnCours.id;
      }
      this.utilisateurService.update(utilisateurPayload).subscribe({
        next: () => this.reloadUtilisateurs(),
        error: () => {/* Optionnel: afficher une erreur */},
        complete: () => { this.showModal = false; }
      });
    }
  }

  reloadUtilisateurs() {
    // Recharge la liste avec mapping clubName
    this.utilisateurService.getAll().subscribe({
      next: (users) => {
        this.utilisateurs = users.map(u => ({
          ...u,
          clubName: u.clubId ? (this.clubs.find(c => c.id === u.clubId)?.nom || this.clubs.find(c => c.id === u.clubId)?.name || u.clubId) : ''
        }));
      },
      error: () => {}
    });
  }

  onCancelForm() {
    this.showModal = false;
  }
}
