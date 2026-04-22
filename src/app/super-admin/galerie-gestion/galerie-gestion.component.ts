import { Component, OnInit } from '@angular/core';
import { UiTableComponent, UiTableColumn } from '../../shared/components/ui-table/ui-table.component';
import { UiModalComponent } from '../../shared/ui/modal/ui-modal.component';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';
import { CommonModule } from '@angular/common';
import { GalerieService, Galerie } from '../../services/galerie.service';
import { ClubService, Club } from '../../services/club.service';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';

@Component({
  selector: 'app-galerie-gestion-super-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, UiTableComponent, UiModalComponent, UiButtonComponent, PageHeaderComponent],
  templateUrl: './galerie-gestion.component.html',
  styleUrls: ['./galerie-gestion.component.css']
})
export class GalerieGestionSuperAdminComponent implements OnInit {
  images: Galerie[] = [];
  clubs: Club[] = [];
  selectedClubId: number = 0;
  role: string = '';

  // Pour le tableau
  tableColumns: UiTableColumn[] = [
    {
      key: 'imageUrl',
      label: 'Image',
      type: 'image',
      cellClass: 'image-cell'
    },
    { key: 'titre', label: 'Titre' },
    { key: 'description', label: 'Description' }
  ];
  tableActions = [
    { label: '', icon: 'ri-edit-line', action: 'edit', color: '#2563eb' },
    { label: '', icon: 'ri-delete-bin-line', action: 'delete', color: '#e53935' }
  ];

  // Pour la modale
  modalOpen = false;
  modalTitle = '';
  formImage: Partial<Galerie> = {};

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e: any) => {
        if (this.formImage) {
          this.formImage.imageUrl = e.target?.result || '';
          (this.formImage as any)._file = file;
        }
      };
      reader.readAsDataURL(file);
    }
  }
  editMode = false;

  constructor(
    private galerieService: GalerieService,
    private clubService: ClubService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.role = (this.authService.getRole() || '').toString().toUpperCase();
    this.clubService.getClubs().subscribe(clubs => {
      this.clubs = clubs;
      if (clubs.length > 0) {
        this.selectedClubId = clubs[0].id;
        this.loadImages(this.selectedClubId);
      }
    });
  }

  onClubChange(clubId: number) {
    this.selectedClubId = clubId;
    this.loadImages(clubId);
  }

  loadImages(clubId: number): void {
    this.galerieService.getGaleriesByClub(clubId).subscribe((data) => {
      const apiBase = environment.apiUrl.replace(/\/api\/?$/i, '');
      this.images = data.map(img => {
        let raw = img.imageUrl || '';
        if (raw.startsWith('galerie/')) raw = raw.replace(/^galerie\//, '');
        let full = '';
        if (!raw) {
          full = '';
        } else if (raw.startsWith('http') || raw.startsWith('/')) {
          full = raw;
        } else {
          full = `${apiBase}/uploads/galerie/${encodeURIComponent(raw)}`;
        }
        return { ...img, imageUrl: full };
      });
    });
  }

  openAddModal() {
    this.editMode = false;
    this.formImage = { titre: '', imageUrl: '', description: '', datePublication: '', clubId: this.selectedClubId };
    this.modalTitle = 'Ajouter une photo';
    this.modalOpen = true;
  }

  openEditModal(image: Galerie) {
    this.editMode = true;
    this.formImage = { ...image };
    this.modalTitle = 'Modifier la photo';
    this.modalOpen = true;
  }

  closeModal() {
    this.modalOpen = false;
    this.formImage = {};
  }

  isSubmitting = false;

  submitImage() {
    if (!this.formImage.titre || !this.formImage.imageUrl || this.isSubmitting) return;
    this.isSubmitting = true;
    this.formImage.clubId = this.selectedClubId;
    const payload: any = {
      titre: this.formImage.titre,
      description: this.formImage.description,
      clubId: this.selectedClubId,
      _file: (this.formImage as any)._file
    };
    if (this.editMode && this.formImage.id) {
      this.galerieService.update(this.formImage.id, this.formImage as any).subscribe(() => {
        this.loadImages(this.selectedClubId);
        this.closeModal();
        this.isSubmitting = false;
      });
    } else {
      this.galerieService.create(payload).subscribe(() => {
        this.loadImages(this.selectedClubId);
        this.closeModal();
        this.isSubmitting = false;
      }, (err) => {
        console.error('[DEBUG][FRONT] Erreur backend:', err);
        this.isSubmitting = false;
      });
    }
  }

  handleTableAction(event: { action: string; row: Galerie }) {
    if (event.action === 'edit') {
      this.openEditModal(event.row);
    } else if (event.action === 'delete') {
      if (confirm('Supprimer cette image ?')) {
        if (event.row.id) {
          this.galerieService.delete(event.row.id).subscribe(() => {
            this.loadImages(this.selectedClubId);
          });
        }
      }
    }
  }
}
