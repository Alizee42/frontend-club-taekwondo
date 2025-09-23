// src/app/services/horaires.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Horaire {
  jour: string;       // ex: "Lundi"
  ouverture: string;  // ex: "09:00"
  fermeture: string;  // ex: "18:00"
}

@Injectable({ providedIn: 'root' })
export class HorairesService {
  private readonly STORAGE_KEY = 'horaires';

  /** État réactif des horaires */
  private horairesSubject = new BehaviorSubject<Horaire[]>([]);
  readonly horaires$ = this.horairesSubject.asObservable();

  constructor() {
    this.loadHoraires();
  }

  /** 🔹 Récupérer les horaires actuels */
  getHoraires(): Horaire[] {
    return this.horairesSubject.value;
  }

  /** 🔹 Ajouter un horaire */
  addHoraire(horaire: Horaire) {
    const updated = [...this.horairesSubject.value, horaire];
    this.updateHoraires(updated);
  }

  /** 🔹 Supprimer un horaire par index */
  deleteHoraire(index: number) {
    const updated = this.horairesSubject.value.filter((_, i) => i !== index);
    this.updateHoraires(updated);
  }

  /** 🔹 Mettre à jour le localStorage et notifier les abonnés */
  private updateHoraires(horaires: Horaire[]) {
    this.horairesSubject.next(horaires);
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(horaires));
    } catch (e) {
      console.error('❌ Erreur sauvegarde horaires dans localStorage', e);
    }
  }

  /** 🔹 Charger depuis le localStorage */
  private loadHoraires() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        this.horairesSubject.next(JSON.parse(saved));
      }
    } catch (e) {
      console.error('❌ Erreur chargement horaires depuis localStorage', e);
    }
  }
}
