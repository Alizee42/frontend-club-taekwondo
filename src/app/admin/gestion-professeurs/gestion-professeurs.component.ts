import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Enseignant, EnseignantService } from '../../services/enseignant.service';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';
import { UiModalComponent } from '../../shared/ui/modal/ui-modal.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { KpiCardComponent } from '../../shared/ui/kpi-card/kpi-card.component';
import { KpiGridComponent } from '../../shared/ui/kpi-grid/kpi-grid.component';

type EnseignantAffiche = Enseignant & { photoUrlBrut?: string };

@Component({
  selector: 'app-gestion-professeurs',
  standalone: true,
  imports: [CommonModule, FormsModule, UiButtonComponent, UiModalComponent, PageHeaderComponent, KpiCardComponent, KpiGridComponent],
  templateUrl: './gestion-professeurs.component.html',
  styleUrls: ['./gestion-professeurs.component.css']
})
export class GestionProfesseursComponent implements OnInit {
  professeurs: EnseignantAffiche[] = [];
  showModal = false;
  photoPreview = '';
  uploadingPhoto = false;
  clubId: number | null = null;

  newProfesseur: Partial<Enseignant> = this.createEmptyProfesseur();
  selected: Enseignant | null = null;

  @ViewChild('photoFileInput') photoFileInput?: ElementRef<HTMLInputElement>;

  constructor(private enseignantService: EnseignantService, private authService: AuthService) {}

  ngOnInit(): void {
    const user = this.authService.getUtilisateurConnecte();
    this.clubId = user?.['clubId'] ?? null;
    if (this.clubId) {
      this.loadProfesseurs();
    } else {
      console.warn('[GestionProfesseurs] clubId utilisateur introuvable — aucun enseignant chargé');
    }
  }

  get totalProfesseurs(): number { return this.professeurs.length; }
  get avecPhoto(): number { return this.professeurs.filter(p => !!p.photoUrl).length; }

  loadProfesseurs(): void {
    if (!this.clubId) return;
    this.enseignantService.getByClub(this.clubId).subscribe({
      next: (list) => {
        this.professeurs = list.map(e => ({ ...e, photoUrlBrut: e.photoUrl, photoUrl: this.toFullImageUrl(e.photoUrl) }));
      },
      error: (error) => console.error('Erreur lors du chargement des enseignants :', error)
    });
  }

  toFullImageUrl(raw?: string): string {
    const apiBase = environment.apiUrl.replace(/\/api\/?$/i, '');
    if (!raw) return '';
    if (raw.startsWith('http') || raw.startsWith('/')) return raw;
    if (raw.startsWith('enseignants/')) return `${apiBase}/uploads/${raw}`;
    return `${apiBase}/uploads/enseignants/${encodeURIComponent(raw)}`;
  }

  openModal(): void {
    this.selected = null;
    this.newProfesseur = this.createEmptyProfesseur();
    this.photoPreview = '';
    this.showModal = true;
  }

  openEditModal(professeur: EnseignantAffiche): void {
    this.selected = professeur;
    this.newProfesseur = { ...professeur, photoUrl: professeur.photoUrlBrut || '' };
    this.photoPreview = professeur.photoUrl || '';
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] || null;

    if (!file) {
      this.photoPreview = '';
      this.newProfesseur.photoUrl = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.photoPreview = String(reader.result || '');
    };
    reader.readAsDataURL(file);

    this.uploadingPhoto = true;
    this.enseignantService.uploadPhoto(file).subscribe({
      next: (res) => {
        this.newProfesseur.photoUrl = res.path;
        this.uploadingPhoto = false;
      },
      error: () => { this.uploadingPhoto = false; }
    });
  }

  addProfesseur(): void {
    if (!this.newProfesseur.nom?.trim() || !this.newProfesseur.prenom?.trim() || !this.clubId) {
      return;
    }

    const payload: Enseignant = {
      clubId: this.clubId,
      nom: this.newProfesseur.nom.trim(),
      prenom: this.newProfesseur.prenom.trim(),
      specialite: this.newProfesseur.specialite?.trim() || '',
      description: this.newProfesseur.description?.trim() || '',
      photoUrl: this.newProfesseur.photoUrl || ''
    };

    if (this.selected?.id) {
      this.enseignantService.update(this.selected.id, payload).subscribe({
        next: () => this.resetForm(),
        error: (error) => console.error("Erreur lors de la modification de l'enseignant :", error)
      });
    } else {
      this.enseignantService.create(payload).subscribe({
        next: () => this.resetForm(),
        error: (error) => console.error("Erreur lors de l'ajout de l'enseignant :", error)
      });
    }
  }

  resetForm(): void {
    this.selected = null;
    this.newProfesseur = this.createEmptyProfesseur();
    this.photoPreview = '';
    this.closeModal();
    if (this.photoFileInput) {
      this.photoFileInput.nativeElement.value = '';
    }
    this.loadProfesseurs();
  }

  deleteProfesseur(id?: number): void {
    if (!id) return;
    this.enseignantService.delete(id).subscribe({
      next: () => this.loadProfesseurs(),
      error: (error) => console.error("Erreur lors de la suppression de l'enseignant :", error)
    });
  }

  professeurInitials(professeur: Partial<Enseignant>): string {
    const prenom = (professeur.prenom || '').trim().charAt(0);
    const nom = (professeur.nom || '').trim().charAt(0);
    return `${prenom}${nom}`.toUpperCase();
  }

  trackByProfesseurId(_: number, professeur: Enseignant): number | undefined {
    return professeur.id;
  }

  private createEmptyProfesseur(): Partial<Enseignant> {
    return {
      nom: '',
      prenom: '',
      specialite: '',
      description: '',
      photoUrl: ''
    };
  }
}
