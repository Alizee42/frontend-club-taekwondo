import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class HorairesService {
  private horaires: any[] = [];

  constructor() {
    this.loadHoraires(); // Charger les horaires depuis le localStorage au démarrage
  }

  getHoraires() {
    return this.horaires;
  }

  addHoraire(horaire: any) {
    this.horaires.push(horaire);
    this.saveHoraires(); // Sauvegarder les horaires après ajout
  }

  deleteHoraire(index: number) {
    this.horaires.splice(index, 1);
    this.saveHoraires(); // Sauvegarder les horaires après suppression
  }

  private saveHoraires() {
    localStorage.setItem('horaires', JSON.stringify(this.horaires)); // Sauvegarde dans le localStorage
  }

  private loadHoraires() {
    const savedHoraires = localStorage.getItem('horaires');
    if (savedHoraires) {
      this.horaires = JSON.parse(savedHoraires); // Charger depuis le localStorage
    }
  }
}