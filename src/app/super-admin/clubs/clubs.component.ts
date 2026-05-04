import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

import { ClubService, Club } from '../../services/club.service';
import { UiTableComponent } from '../../shared/components/ui-table/ui-table.component';
import { UiModalComponent } from '../../shared/ui/modal/ui-modal.component';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { KpiCardComponent } from '../../shared/ui/kpi-card/kpi-card.component';
import { KpiGridComponent } from '../../shared/ui/kpi-grid/kpi-grid.component';

type ClubFormModel = Pick<Club, 'name' | 'adresse' | 'telephone' | 'email'> & {
  id?: number;
  logo?: string;
  rib?: string;
};

const EMPTY_CLUB_FORM: ClubFormModel = {
  name: '',
  adresse: '',
  telephone: '',
  email: '',
  logo: '',
  rib: ''
};

@Component({
  selector: 'app-super-admin-clubs',
  standalone: true,
  imports: [CommonModule, FormsModule, UiTableComponent, UiModalComponent, UiButtonComponent, PageHeaderComponent, KpiCardComponent, KpiGridComponent],
  templateUrl: './clubs.component.html',
  styleUrls: ['./clubs.component.css']
})
export class ClubsComponent implements OnInit {
  openClubModal = false;
  openDeleteModal = false;
  selectedClub: Club | null = null;
  clubToDelete: Club | null = null;
  clubForm: ClubFormModel = { ...EMPTY_CLUB_FORM };

  loading = false;
  saving = false;
  deleting = false;
  errorMessage = '';
  successMessage = '';
  modalError = '';
  deleteError = '';

  clubs: Club[] = [];

  get nbClubs()     { return this.clubs.length; }
  get avecLogo()    { return this.clubs.filter(c => !!c.logo).length; }
  get avecRib()     { return this.clubs.filter(c => !!c.rib).length; }

  clubColumns = [
    { key: 'name', label: 'Nom', display: (club: Club) => club.name || club.nom || '-' },
    { key: 'adresse', label: 'Adresse', display: (club: Club) => club.adresse || '-' },
    { key: 'telephone', label: 'Telephone', display: (club: Club) => club.telephone || '-' },
    { key: 'email', label: 'Email', display: (club: Club) => club.email || '-' }
  ];

  clubActions = [
    { label: 'Modifier', icon: 'ri-edit-line', action: 'edit', variant: 'ghost' as const, title: 'Modifier le club' },
    { label: 'Supprimer', icon: 'ri-delete-bin-line', action: 'delete', variant: 'danger' as const, title: 'Supprimer le club' }
  ];

  constructor(private clubService: ClubService) {}

  ngOnInit(): void {
    this.loadClubs();
  }

  loadClubs(): void {
    this.loading = true;
    this.errorMessage = '';

    this.clubService.getClubs().subscribe({
      next: (clubs) => {
        this.clubs = clubs || [];
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les clubs.';
        this.loading = false;
      }
    });
  }

  openCreateModal(): void {
    this.selectedClub = null;
    this.clubForm = { ...EMPTY_CLUB_FORM };
    this.modalError = '';
    this.openClubModal = true;
  }

  openEditModal(club: Club): void {
    this.selectedClub = club;
    this.clubForm = {
      id: club.id,
      name: club.name || club.nom || '',
      adresse: club.adresse || '',
      telephone: club.telephone || '',
      email: club.email || '',
      logo: club.logo || '',
      rib: club.rib || ''
    };
    this.modalError = '';
    this.openClubModal = true;
  }

  closeClubModal(): void {
    if (this.saving) return;
    this.openClubModal = false;
    this.selectedClub = null;
    this.clubForm = { ...EMPTY_CLUB_FORM };
    this.modalError = '';
  }

  handleClubAction(event: { action: string; row: Club }): void {
    if (event.action === 'edit') {
      this.openEditModal(event.row);
      return;
    }

    if (event.action === 'delete') {
      this.openDeleteConfirm(event.row);
    }
  }

  saveClub(form: NgForm): void {
    this.modalError = '';
    this.successMessage = '';

    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    this.saving = true;
    const payload = this.normalizePayload(this.clubForm);
    const request$ = this.selectedClub
      ? this.clubService.editClub({ ...payload, id: this.selectedClub.id } as Club)
      : this.clubService.createClub(payload);

    request$.subscribe({
      next: () => {
        this.successMessage = this.selectedClub ? 'Club modifie avec succes.' : 'Club cree avec succes.';
        this.saving = false;
        this.closeClubModal();
        this.loadClubs();
      },
      error: (err) => {
        this.modalError = this.getErrorMessage(err);
        this.saving = false;
      }
    });
  }

  openDeleteConfirm(club: Club): void {
    this.clubToDelete = club;
    this.deleteError = '';
    this.openDeleteModal = true;
  }

  closeDeleteModal(): void {
    if (this.deleting) return;
    this.openDeleteModal = false;
    this.clubToDelete = null;
    this.deleteError = '';
  }

  confirmDelete(): void {
    if (!this.clubToDelete?.id || this.deleting) return;

    this.deleting = true;
    this.deleteError = '';
    this.successMessage = '';

    this.clubService.deleteClub(this.clubToDelete.id).subscribe({
      next: () => {
        this.successMessage = 'Club supprime avec succes.';
        this.deleting = false;
        this.closeDeleteModal();
        this.loadClubs();
      },
      error: (err) => {
        this.deleteError = this.getErrorMessage(err);
        this.deleting = false;
      }
    });
  }

  get modalTitle(): string {
    return this.selectedClub ? 'Modifier le club' : 'Creer un club';
  }

  get modalSubtitle(): string {
    return this.selectedClub
      ? 'Mettez a jour les informations publiques et administratives du club.'
      : 'Ajoutez un nouveau club disponible dans la plateforme.';
  }

  private normalizePayload(form: ClubFormModel): Partial<Club> {
    return {
      name: this.clean(form.name),
      adresse: this.clean(form.adresse),
      telephone: this.clean(form.telephone),
      email: this.clean(form.email),
      logo: this.clean(form.logo),
      rib: this.clean(form.rib)
    };
  }

  private clean(value?: string): string {
    return (value || '').trim();
  }

  private getErrorMessage(err: any): string {
    return err?.error?.message
      || err?.error?.error
      || err?.message
      || 'Une erreur est survenue. Verifiez les informations puis reessayez.';
  }
}
