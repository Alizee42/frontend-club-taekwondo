import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MembreService, Membre } from '../../services/membre.service';
import { AuthService, Utilisateur } from '../../services/auth.service';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';
import { UiModalComponent } from '../../shared/ui/modal/ui-modal.component';
import { UiTableComponent } from '../../shared/components/ui-table/ui-table.component';
import { UiTitleComponent } from '../../shared/ui/title/ui-title.component';
import { UiFormComponent } from '../../shared/ui/form/ui-form.component';

@Component({
  selector: 'app-membres-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, UiButtonComponent, UiModalComponent, UiTableComponent, UiTitleComponent, UiFormComponent],
  templateUrl: './membres-admin.component.html',
  styleUrls: ['./membres-admin.component.css']
})
export class MembresAdminComponent implements OnInit {
  membres: Membre[] = [];
  loading = false;
  error: string | null = null;
  showModal = false;
  modalMode: 'ajout' | 'edition' = 'ajout';
  membreEnCours: Partial<Membre> = {};
  fields = [
    { name: 'nom', label: 'Nom', type: 'text', required: true, placeholder: 'Nom du membre' },
    { name: 'prenom', label: 'Prénom', type: 'text', required: true, placeholder: 'Prénom du membre' }
  ];
  columns = [
    { key: 'nom', label: 'Nom' },
    { key: 'prenom', label: 'Prénom' },
    { key: 'id', label: 'ID' }
  ];
  actions = [
    { label: 'Éditer', icon: 'ri-edit-2-line', action: 'edit', color: '#2563eb' },
    { label: 'Supprimer', icon: 'ri-delete-bin-6-line', action: 'delete', color: '#e53935' }
  ];
  clubId: number|null = null;

  constructor(private membreService: MembreService, private authService: AuthService) {}

  ngOnInit(): void {
    this.loading = true;
    const utilisateur: Utilisateur | null = this.authService.getUtilisateurConnecte();
    this.clubId = utilisateur?.['clubId'] || null;
    if (this.clubId) {
      this.loadMembresForClub(this.clubId);
    } else {
      this.loading = false;
      this.error = "Aucun club associé à cet administrateur.";
    }
  }

  openAjoutModal() {
    this.modalMode = 'ajout';
    this.membreEnCours = { nom: '', prenom: '' };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.membreEnCours = {};
  }

  onTableAction(event: { action: string, row: any }) {
    if (event.action === 'edit') this.openEditModal(event.row);
    if (event.action === 'delete') this.deleteMembre(event.row);
  }

  openEditModal(membre: Membre) {
    this.modalMode = 'edition';
    this.membreEnCours = { ...membre };
    this.showModal = true;
  }

  onSubmitForm(formValue: any) {
    if (!this.clubId || !formValue.nom || !formValue.prenom) return;
    if (this.modalMode === 'ajout') {
      this.membreService.addMembreToClub(this.clubId, formValue).subscribe({
        next: () => { this.loadMembresForClub(this.clubId!); this.closeModal(); },
        error: (err) => { this.error = "Erreur lors de l'ajout du membre."; }
      });
    } else {
      this.membreService.updateMembre(formValue).subscribe({
        next: () => { this.loadMembresForClub(this.clubId!); this.closeModal(); },
        error: (err) => { this.error = "Erreur lors de la modification du membre."; }
      });
    }
  }

  deleteMembre(membre: Membre) {
    if (!membre.id) return;
    if (confirm('Voulez-vous vraiment supprimer ce membre ?')) {
      this.membreService.deleteMembre(membre.id).subscribe({
        next: () => this.loadMembresForClub(this.clubId!),
        error: () => { this.error = "Erreur lors de la suppression du membre."; }
      });
    }
  }

  private loadMembresForClub(clubId: number|string) {
    this.loading = true;
    this.error = null;
    this.membreService.getMembresParClub(clubId).subscribe({
      next: (membres) => {
        this.membres = membres || [];
        this.loading = false;
      },
      error: (err) => {
        this.error = "Erreur lors du chargement des membres.";
        this.loading = false;
      }
    });
  }
}
