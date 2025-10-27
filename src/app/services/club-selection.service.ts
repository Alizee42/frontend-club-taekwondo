import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ClubSelectionService {
  private selectedClubIdSubject = new BehaviorSubject<number|null>(null);
  selectedClubId$ = this.selectedClubIdSubject.asObservable();

  setSelectedClubId(id: number|null) {
    this.selectedClubIdSubject.next(id);
  }

  getSelectedClubId(): number|null {
    return this.selectedClubIdSubject.value;
  }
}
