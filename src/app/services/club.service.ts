import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';

export interface Club {
  id: number;
  name: string;
  nom: string;
  ville: string;
  logo?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
}

@Injectable({ providedIn: 'root' })
export class ClubService {
  deleteClub(id: number): Observable<any> {
    return this.http.delete(`/api/clubs/${id}`);
  }
  private selectedClubSubject: BehaviorSubject<Club | null>;
  public selectedClub$: Observable<Club | null>;

  constructor(private http: HttpClient) {
    const club = this.getSelectedClub();
    this.selectedClubSubject = new BehaviorSubject<Club | null>(club);
    this.selectedClub$ = this.selectedClubSubject.asObservable();
  }

  getClubs(): Observable<Club[]> {
    return this.http.get<Club[]>('/api/clubs');
  }

  createClub(payload: Partial<Club>): Observable<Club> {
    return this.http.post<Club>('/api/clubs', payload);
  }

  editClub(club: Club): Observable<Club> {
    return this.http.put<Club>(`/api/clubs/${club.id}`, club);
  }

  getSelectedClub(): Club | null {
    const club = localStorage.getItem('selectedClub');
    return club ? JSON.parse(club) : null;
  }

  setSelectedClub(club: Club) {
    localStorage.setItem('selectedClub', JSON.stringify(club));
    this.selectedClubSubject.next(club);
  }

  clearSelectedClub() {
    localStorage.removeItem('selectedClub');
    this.selectedClubSubject.next(null);
  }
}
