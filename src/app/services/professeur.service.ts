import { Injectable } from '@angular/core';

export interface Professeur {
  id: number;
  nom: string;
  prenom: string;
  specialite: string;
  description: string;
  photo: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProfesseurService {
  private professeurs: Professeur[] = [];
  private nextId = 1;

  constructor() {
    this.loadFromLocalStorage();
  }

  /** 🔹 Récupérer tous les professeurs */
  getProfesseurs(): Professeur[] {
    return [...this.professeurs]; // copie pour éviter modifications externes
  }

  /** 🔹 Ajouter un professeur */
  addProfesseur(professeur: Omit<Professeur, 'id'>): void {
    const newProfesseur: Professeur = { id: this.nextId++, ...professeur };
    this.professeurs.push(newProfesseur);
    this.saveToLocalStorage();
  }

  /** 🔹 Mettre à jour un professeur */
  updateProfesseur(id: number, updates: Partial<Omit<Professeur, 'id'>>): void {
    const index = this.professeurs.findIndex((p) => p.id === id);
    if (index !== -1) {
      this.professeurs[index] = { ...this.professeurs[index], ...updates };
      this.saveToLocalStorage();
    }
  }

  /** 🔹 Supprimer un professeur */
  deleteProfesseur(id: number): void {
    this.professeurs = this.professeurs.filter((prof) => prof.id !== id);
    this.saveToLocalStorage();
  }

  /** 🔹 Sauvegarder les données */
  private saveToLocalStorage(): void {
    localStorage.setItem('professeurs', JSON.stringify(this.professeurs));
    localStorage.setItem('nextId', this.nextId.toString());
  }

  /** 🔹 Charger les données */
  private loadFromLocalStorage(): void {
    try {
      const savedProfesseurs = localStorage.getItem('professeurs');
      const savedNextId = localStorage.getItem('nextId');
      if (savedProfesseurs) {
        this.professeurs = JSON.parse(savedProfesseurs);
      }
      if (savedNextId) {
        this.nextId = parseInt(savedNextId, 10);
      }
    } catch (err) {
      console.error('[ProfesseurService] Erreur parsing localStorage', err);
      this.professeurs = [];
      this.nextId = 1;
    }
  }
}
