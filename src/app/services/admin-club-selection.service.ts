import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * Sélection de club centralisée pour le sélecteur unique du header, utilisé
 * uniquement par les pages SUPER_ADMIN (admin/ et super-admin/). Distinct de
 * ClubSelectionService, qui sert le contexte club des pages publiques
 * (boutique, événements, avis, horaires...) et ne connaît pas la notion
 * "Tous les clubs".
 *
 * Ne concerne jamais les pages ADMIN, qui restent verrouillées sur leur
 * propre club via AuthService.
 *
 * null = pas encore initialisé, 'all' = "Tous les clubs".
 */
@Injectable({ providedIn: 'root' })
export class AdminClubSelectionService {
  private selectedClubIdSubject = new BehaviorSubject<number | 'all' | null>(null);
  selectedClubId$ = this.selectedClubIdSubject.asObservable();

  setSelectedClubId(id: number | 'all' | null) {
    this.selectedClubIdSubject.next(id);
  }

  getSelectedClubId(): number | 'all' | null {
    return this.selectedClubIdSubject.value;
  }
}
