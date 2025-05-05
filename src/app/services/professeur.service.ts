import { Injectable } from '@angular/core';

export interface Professeur {
  id: number;
  nom: string;
  prenom: string;
  specialite: string;
  description: string;
  photo: string;
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

  // Récupérer tous les professeurs
  getProfesseurs(): Professeur[] {
    return this.professeurs;
  }

  // Ajouter un professeur
  addProfesseur(professeur: Omit<Professeur, 'id'>): void {
    const newProfesseur: Professeur = { id: this.nextId++, ...professeur };
    this.professeurs.push(newProfesseur);
    this.saveToLocalStorage();
  }

  // Supprimer un professeur
  deleteProfesseur(id: number): void {
    this.professeurs = this.professeurs.filter((prof) => prof.id !== id);
    this.saveToLocalStorage();
  }

  // Sauvegarder les données dans localStorage
  private saveToLocalStorage(): void {
    localStorage.setItem('professeurs', JSON.stringify(this.professeurs));
    localStorage.setItem('nextId', this.nextId.toString());
  }

  // Charger les données depuis localStorage
  private loadFromLocalStorage(): void {
    const savedProfesseurs = localStorage.getItem('professeurs');
    const savedNextId = localStorage.getItem('nextId');
    if (savedProfesseurs) {
      this.professeurs = JSON.parse(savedProfesseurs);
    }
    if (savedNextId) {
      this.nextId = parseInt(savedNextId, 10);
    }
  }
}