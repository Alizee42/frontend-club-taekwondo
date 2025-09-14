// src/app/services/membre.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Membre {
  id: number;
  nom: string;
  prenom: string;
}

@Injectable({ providedIn: 'root' })
export class MembreService {
  private apiUrl = `${environment.apiUrl}/membres`;

  constructor(private http: HttpClient) {}

  private authHeaders(): HttpHeaders {
    // lit token OU auth_token ; n’ajoute le header que si présent
    const token = (localStorage.getItem('token') || localStorage.getItem('auth_token') || '').trim();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  /** Enfants du parent connecté */
  getMembresPourParentConnecte(): Observable<Membre[] | null> {
    const headers = this.authHeaders();
    if (!headers.has('Authorization')) return of(null);
    return this.http.get<Membre[]>(`${this.apiUrl}/mes-enfants`, { headers }).pipe(
      catchError(err => {
        if (err.status === 400 || err.status === 401) return of(null);
        return of(null);
      })
    );
  }

  /** Membre lié à l’utilisateur connecté */
  getMembreConnecte(): Observable<Membre | null> {
    const headers = this.authHeaders();
    if (!headers.has('Authorization')) return of(null);
    return this.http.get<Membre>(`${this.apiUrl}/me`, { headers }).pipe(
      catchError(err => {
        if (err.status === 400 || err.status === 401) return of(null);
        return of(null);
      })
    );
  }
}
