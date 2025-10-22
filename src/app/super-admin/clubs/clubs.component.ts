import { Component, OnInit } from '@angular/core';
import { ClubService, Club } from '../../services/club.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiTableComponent } from '../../shared/components/ui-table/ui-table.component';
import { UiFormComponent } from '../../shared/ui/form/ui-form.component';
import { UiModalComponent } from '../../shared/ui/modal/ui-modal.component';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';

@Component({
  selector: 'app-super-admin-clubs',
  standalone: true,
  imports: [CommonModule, FormsModule, UiTableComponent, UiFormComponent, UiModalComponent, UiButtonComponent],
  templateUrl: './clubs.component.html',
  styleUrls: ['./clubs.component.css']
})
export class ClubsComponent implements OnInit {
  openClubModal = false;
  selectedClub: Club | null = null;
  clubColumns = [
    { key: 'name', label: 'Nom' },
    { key: 'adresse', label: 'Adresse' },
    { key: 'telephone', label: 'Téléphone' },
    { key: 'email', label: 'Email' }
  ];
  clubActions = [
    { label: '', icon: 'ri-edit-line', action: 'edit', color: '#2563eb' },
    { label: '', icon: 'ri-delete-bin-line', action: 'delete', color: '#e53935' }
  ];
  clubFormFields = [
    { name: 'name', label: 'Nom', type: 'text', required: true, placeholder: 'Nom du club' },
    { name: 'adresse', label: 'Adresse', type: 'text', required: true, placeholder: 'Adresse complète' },
    { name: 'telephone', label: 'Téléphone', type: 'text', required: true, placeholder: 'Numéro de téléphone' },
    { name: 'email', label: 'Email', type: 'text', required: true, placeholder: 'Email' },
    { name: 'logo', label: 'Logo (URL)', type: 'text', required: false, placeholder: 'URL du logo (facultatif)' }
  ];
  clubs: Club[] = [];
  loading = false;

  // Form model
  newClub: Partial<Club> = { name: '', adresse: '', telephone: '', email: '', logo: '' };

  constructor(private clubService: ClubService) {}

  ngOnInit(): void {
    this.loadClubs();
  }

  loadClubs() {
    this.loading = true;
    this.clubService.getClubs().subscribe({
      next: (c) => { this.clubs = c; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  createClub() {
    if (!this.newClub.name || this.newClub.name.trim() === '') return;
    this.clubService.createClub(this.newClub).subscribe({
      next: (created) => {
        this.clubs.push(created);
        this.newClub = { name: '', adresse: '', telephone: '', email: '', logo: '' };
      },
      error: (err) => {
        console.error('Erreur création club', err);
      }
    });
  }

  // Pour <ui-table>
  handleClubAction(event: { action: string; row: Club }) {
    if (event.action === 'edit') {
      this.selectedClub = event.row;
      this.openClubModal = true;
    } else if (event.action === 'delete') {
      this.supprimerClub(event.row.id);
    }
  }

  // Pour <ui-form>
  onClubFormSubmit(club: Club) {
    if (this.selectedClub) {
      // Edition
      this.clubService.editClub(club).subscribe(() => {
        this.openClubModal = false;
        this.selectedClub = null;
        this.loadClubs();
      });
    } else {
      // Création
      this.clubService.createClub(club).subscribe(() => {
        this.openClubModal = false;
        this.loadClubs();
      });
    }
  }

  closeClubModal() {
    this.openClubModal = false;
    this.selectedClub = null;
  }

  supprimerClub(id: number) {
    this.clubService.deleteClub(id).subscribe(() => {
      this.loadClubs();
    });
  }
}