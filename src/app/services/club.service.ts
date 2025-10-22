import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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
    const token = localStorage.getItem('token');
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    return this.http.delete(`/api/clubs/${id}`, { headers });
  }
  private selectedClubSubject: BehaviorSubject<Club | null>;
  public selectedClub$: Observable<Club | null>;

  constructor(private http: HttpClient) {
    const club = this.getSelectedClub();
    this.selectedClubSubject = new BehaviorSubject<Club | null>(club);
    this.selectedClub$ = this.selectedClubSubject.asObservable();
  }

  getClubs(): Observable<Club[]> {
    const token = localStorage.getItem('token');
    console.log('Token utilisé pour clubs:', token);
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    return this.http.get<Club[]>('/api/clubs', { headers });
  }
  
  createClub(payload: Partial<Club>): Observable<Club> {
    const token = localStorage.getItem('token');
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    return this.http.post<Club>('/api/clubs', payload, { headers });
  }

  editClub(club: Club): Observable<Club> {
    const token = localStorage.getItem('token');
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    return this.http.put<Club>(`/api/clubs/${club.id}`, club, { headers });
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
