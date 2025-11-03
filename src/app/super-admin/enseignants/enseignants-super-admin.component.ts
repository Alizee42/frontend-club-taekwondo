import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Club, ClubService } from '../../services/club.service';
import { Enseignant, EnseignantService } from '../../services/enseignant.service';
import { environment } from '../../../environments/environment';
import { UiTitleComponent } from '../../ui/ui-title/ui-title.component';
import { UiTableComponent, UiTableColumn } from '../../shared/components/ui-table/ui-table.component';
import { UiModalComponent } from '../../shared/ui/modal/ui-modal.component';
import { UiFormComponent } from '../../shared/ui/form/ui-form.component';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';

@Component({
  selector: 'app-enseignants-super-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, UiTitleComponent, UiTableComponent, UiModalComponent, UiFormComponent, UiButtonComponent],
  templateUrl: './enseignants-super-admin.component.html',
  styleUrls: ['./enseignants-super-admin.component.css']
})
export class EnseignantsSuperAdminComponent implements OnInit {
  clubs: Club[] = [];
  selectedClubId: number | null = null;
  enseignants: Enseignant[] = [];
  loading = false;

  form: Partial<Enseignant> = {
    clubId: 0,
    nom: '',
    prenom: '',
    specialite: '',
    description: '',
    photoUrl: ''
  };

  // UI state
  openModal = false;
  selected: Enseignant | null = null;
  photoPreviewUrl: string | null = null;
  uploadingPhoto = false;

  // Table config
  columns: UiTableColumn[] = [
    { key: 'photoUrl', label: 'Photo', type: 'image', width: '80px' },
    { key: 'nom', label: 'Nom' },
    { key: 'prenom', label: 'Prénom' },
    { key: 'specialite', label: 'Spécialité' }
  ];
  actions = [
    { label: '', icon: 'ri-edit-line', action: 'edit', color: '#2563eb' },
    { label: '', icon: 'ri-delete-bin-line', action: 'delete', color: '#e53935' }
  ];

  // Form config
  formFields = [
    { name: 'nom', label: 'Nom', type: 'text', required: true, placeholder: 'Nom' },
    { name: 'prenom', label: 'Prénom', type: 'text', required: true, placeholder: 'Prénom' },
    { name: 'specialite', label: 'Spécialité', type: 'text', required: false, placeholder: 'Spécialité' },
    { name: '_photo', label: 'Photo (upload)', type: 'file', required: false, onChange: this.onPhotoSelected.bind(this) },
    { name: 'facebook', label: 'Facebook', type: 'text', required: false, placeholder: 'https://facebook.com/...' },
    { name: 'instagram', label: 'Instagram', type: 'text', required: false, placeholder: 'https://instagram.com/...' },
    { name: 'linkedin', label: 'LinkedIn', type: 'text', required: false, placeholder: 'https://linkedin.com/in/...' },
    { name: 'description', label: 'Description', type: 'text', required: false, placeholder: 'Description courte' }
  ];

  constructor(
    private clubService: ClubService,
    private enseignantService: EnseignantService
  ) {}

  ngOnInit(): void {
    this.clubService.getClubs().subscribe({
      next: (clubs) => {
        this.clubs = clubs;
        if (clubs.length > 0) {
          this.selectedClubId = clubs[0].id;
          this.loadEnseignants();
        }
      }
    });
  }

  onClubChange() {
    this.loadEnseignants();
  }

  loadEnseignants() {
    if (!this.selectedClubId) return;
    this.loading = true;
    this.enseignantService.getByClub(this.selectedClubId).subscribe({
      next: (list) => { this.enseignants = list.map(e => ({
          ...e,
          photoUrl: this.toFullImageUrl(e.photoUrl)
        })); this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  openCreateModal() {
    if (!this.selectedClubId) return;
    this.selected = null;
    this.form = { clubId: this.selectedClubId as number, nom: '', prenom: '', specialite: '', description: '', photoUrl: '' };
    this.photoPreviewUrl = null;
    this.openModal = true;
  }

  handleAction(event: { action: string; row: Enseignant }) {
    if (event.action === 'edit') {
      this.selected = event.row;
      this.form = { ...event.row };
      // Prévisualiser la photo existante si disponible
      this.photoPreviewUrl = this.toFullImageUrl(this.form.photoUrl);
      this.openModal = true;
    }
    if (event.action === 'delete') {
      this.remove(event.row.id);
    }
  }

  onFormSubmit(model: any) {
    if (!this.selectedClubId) return;
    // la photo peut venir de l'upload (this.form.photoUrl) plutôt que du model émis par ui-form
    const photoUrl = this.form.photoUrl || model.photoUrl;
    const payload: Enseignant = {
      clubId: this.selectedClubId,
      nom: model.nom,
      prenom: model.prenom,
      specialite: model.specialite,
      description: model.description,
      photoUrl,
      facebook: model.facebook,
      instagram: model.instagram,
      linkedin: model.linkedin,
      id: this.selected?.id
    };

    if (this.selected?.id) {
      this.enseignantService.update(this.selected.id, payload).subscribe({
        next: (updated) => {
          const idx = this.enseignants.findIndex(e => e.id === updated.id);
          if (idx >= 0) this.enseignants[idx] = { ...updated, photoUrl: this.toFullImageUrl(updated.photoUrl) } as any;
          this.openModal = false;
          this.selected = null;
        }
      });
    } else {
      this.enseignantService.create(payload).subscribe({
        next: (created) => {
          this.enseignants.push({ ...created, photoUrl: this.toFullImageUrl(created.photoUrl) } as any);
          this.openModal = false;
        }
      });
    }
  }

  remove(id?: number) {
    if (!id) return;
    this.enseignantService.delete(id).subscribe({
      next: () => {
        this.enseignants = this.enseignants.filter(e => e.id !== id);
      }
    });
  }

  // --- Upload photo ---
  onPhotoSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    // Preview immédiate
    const reader = new FileReader();
    reader.onload = () => {
      this.photoPreviewUrl = reader.result as string;
    };
    reader.readAsDataURL(file);

    this.uploadingPhoto = true;
    this.enseignantService.uploadPhoto(file).subscribe({
      next: (res) => {
        // res.path ex: "enseignants/123_photo.jpg"
        this.form.photoUrl = res.path;
        this.uploadingPhoto = false;
      },
      error: () => { this.uploadingPhoto = false; }
    });
  }

  toFullImageUrl(raw?: string): string {
    const apiBase = environment.apiUrl.replace(/\/api\/?$/i, '');
    if (!raw) return '';
    if (raw.startsWith('http') || raw.startsWith('/')) return raw;
    // si le chemin commence déjà par 'enseignants/' => /uploads/<raw>
    if (raw.startsWith('enseignants/')) return `${apiBase}/uploads/${encodeURIComponent(raw)}`;
    return `${apiBase}/uploads/enseignants/${encodeURIComponent(raw)}`;
  }
}
