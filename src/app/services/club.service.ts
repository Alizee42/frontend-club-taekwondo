import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Club {
  id: number;
  name: string;
  logo?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
}

@Injectable({ providedIn: 'root' })
export class ClubService {
  constructor(private http: HttpClient) {}

  getClubs(): Observable<Club[]> {
    const token = localStorage.getItem('token');
    console.log('Token utilisé pour clubs:', token);
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    return this.http.get<Club[]>('/api/clubs', { headers });
  }

  getSelectedClub(): Club | null {
    const club = localStorage.getItem('selectedClub');
    return club ? JSON.parse(club) : null;
  }

  setSelectedClub(club: Club) {
    localStorage.setItem('selectedClub', JSON.stringify(club));
  }

  clearSelectedClub() {
    localStorage.removeItem('selectedClub');
  }
}
