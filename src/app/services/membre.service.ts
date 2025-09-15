// src/app/services/membre.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
  private readonly apiUrl = `${environment.apiUrl}/membres`;

  constructor(private http: HttpClient) {}

  /** Enfants du parent connecté */
  getMembresPourParentConnecte(): Observable<Membre[] | null> {
    return this.http.get<Membre[]>(`${this.apiUrl}/mes-enfants`).pipe(
      catchError(err => {
        if (err.status === 400 || err.status === 401) return of(null);
        return of(null);
      })
    );
  }

  /** Membre lié à l’utilisateur connecté */
  getMembreConnecte(): Observable<Membre | null> {
    return this.http.get<Membre>(`${this.apiUrl}/me`).pipe(
      catchError(err => {
        if (err.status === 400 || err.status === 401) return of(null);
        return of(null);
      })
    );
  }
}
