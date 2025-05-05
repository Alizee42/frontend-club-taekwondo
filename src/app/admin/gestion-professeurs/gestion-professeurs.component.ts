import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ProfesseurService, Professeur } from '../../services/professeur.service';

@Component({
  selector: 'app-gestion-professeurs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-professeurs.component.html',
  styleUrls: ['./gestion-professeurs.component.css'],
})
export class GestionProfesseursComponent {
  professeurs: Professeur[] = [];
  newProfesseur: Partial<Professeur> = {
    nom: '',
    prenom: '',
    specialite: '',
    description: '',
  };
  showModal = false;

  constructor(private professeurService: ProfesseurService) {
    this.loadProfesseurs();
  }

  loadProfesseurs(): void {
    this.professeurs = this.professeurService.getProfesseurs();
  }

  openModal(): void {
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  addProfesseur(): void {
    if (this.newProfesseur.nom && this.newProfesseur.prenom) {
      const fileInput = document.getElementById('photo') as HTMLInputElement;
      const file = fileInput?.files?.[0];
  
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          this.newProfesseur.photo = reader.result as string; // Convertir l'image en base64
          this.professeurService.addProfesseur(this.newProfesseur as Omit<Professeur, 'id'>);
          this.resetForm();
        };
        reader.readAsDataURL(file);
      } else {
        this.professeurService.addProfesseur(this.newProfesseur as Omit<Professeur, 'id'>);
        this.resetForm();
      }
    }
  }
  
  resetForm(): void {
    this.newProfesseur = { nom: '', prenom: '', specialite: '', description: '', photo: '' };
    this.closeModal();
    this.loadProfesseurs();
  }

  deleteProfesseur(id: number): void {
    this.professeurService.deleteProfesseur(id);
    this.loadProfesseurs();
  }
}