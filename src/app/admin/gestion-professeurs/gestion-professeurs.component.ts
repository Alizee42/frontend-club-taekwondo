import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Professeur, ProfesseurService } from '../../services/professeur.service';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';
import { UiModalComponent } from '../../shared/ui/modal/ui-modal.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { KpiCardComponent } from '../../shared/ui/kpi-card/kpi-card.component';
import { KpiGridComponent } from '../../shared/ui/kpi-grid/kpi-grid.component';

@Component({
  selector: 'app-gestion-professeurs',
  standalone: true,
  imports: [CommonModule, FormsModule, UiButtonComponent, UiModalComponent, PageHeaderComponent, KpiCardComponent, KpiGridComponent],
  templateUrl: './gestion-professeurs.component.html',
  styleUrls: ['./gestion-professeurs.component.css']
})
export class GestionProfesseursComponent {
  professeurs: Professeur[] = [];
  showModal = false;
  photoPreview = '';

  newProfesseur: Partial<Professeur> = this.createEmptyProfesseur();

  constructor(private professeurService: ProfesseurService) {
    this.loadProfesseurs();
  }

  get totalProfesseurs(): number { return this.professeurs.length; }
  get avecPhoto(): number { return this.professeurs.filter(p => !!p.photo).length; }

  loadProfesseurs(): void {
    this.professeurs = this.professeurService.getProfesseurs();
  }

  openModal(): void {
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
      this.newProfesseur.photo = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      this.newProfesseur.photo = result;
      this.photoPreview = result;
    };
    reader.readAsDataURL(file);
  }

  addProfesseur(): void {
    if (!this.newProfesseur.nom?.trim() || !this.newProfesseur.prenom?.trim()) {
      return;
    }

    this.professeurService.addProfesseur({
      nom: this.newProfesseur.nom.trim(),
      prenom: this.newProfesseur.prenom.trim(),
      specialite: this.newProfesseur.specialite?.trim() || '',
      description: this.newProfesseur.description?.trim() || '',
      photo: this.newProfesseur.photo || '',
      facebook: '',
      instagram: '',
      linkedin: ''
    });

    this.resetForm();
  }

  resetForm(): void {
    this.newProfesseur = this.createEmptyProfesseur();
    this.photoPreview = '';
    this.closeModal();
    this.loadProfesseurs();
  }

  deleteProfesseur(id: number): void {
    this.professeurService.deleteProfesseur(id);
    this.loadProfesseurs();
  }

  professeurInitials(professeur: Partial<Professeur>): string {
    const prenom = (professeur.prenom || '').trim().charAt(0);
    const nom = (professeur.nom || '').trim().charAt(0);
    return `${prenom}${nom}`.toUpperCase();
  }

  trackByProfesseurId(_: number, professeur: Professeur): number {
    return professeur.id;
  }

  private createEmptyProfesseur(): Partial<Professeur> {
    return {
      nom: '',
      prenom: '',
      specialite: '',
      description: '',
      photo: ''
    };
  }
}
