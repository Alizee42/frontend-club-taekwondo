// src/app/services/membre.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Membre {
  id: number;
  nom: string;
  prenom: string;
  email?: string;
  dateNaissance?: string;
  utilisateurId?: number; // lien avec parent/utilisateur
}

@Injectable({ providedIn: 'root' })
export class MembreService {
  private readonly apiUrl = `${environment.apiUrl}/membres`;

  constructor(private http: HttpClient) {}

  /** 🔹 Enfants du parent connecté */
  getMembresPourParentConnecte(): Observable<Membre[] | null> {
    return this.http.get<Membre[]>(`${this.apiUrl}/mes-enfants`).pipe(
      catchError(err => this.handleAuthError(err))
    );
  }

  /** 🔹 Membre lié à l’utilisateur connecté */
  getMembreConnecte(): Observable<Membre | null> {
    return this.http.get<Membre>(`${this.apiUrl}/me`).pipe(
      catchError(err => this.handleAuthError(err))
    );
  }

  /** 🔹 Récupérer un membre par ID (admin ou parent) */
  getById(id: number): Observable<Membre> {
    return this.http.get<Membre>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /** 🔹 Lister tous les membres (côté admin) */
  getAll(): Observable<Membre[]> {
    return this.http.get<Membre[]>(this.apiUrl).pipe(
      catchError(this.handleError)
    );
  }

  /** 🔹 Mettre à jour un membre */
  updateMembre(id: number, data: Partial<Membre>): Observable<Membre> {
    return this.http.put<Membre>(`${this.apiUrl}/${id}`, data).pipe(
      catchError(this.handleError)
    );
  }

  /** 🔹 Supprimer un membre */
  deleteMembre(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /* =====================
       Gestion d’erreurs
     ===================== */

  private handleAuthError(error: any): Observable<null> {
    if (error.status === 400 || error.status === 401) {
      return of(null);
    }
    return of(null);
  }

  private handleError(error: HttpErrorResponse) {
    const msg = error.error instanceof ErrorEvent
      ? `Erreur: ${error.error.message}`
      : `Erreur serveur ${error.status}: ${error.message}`;
    console.error('[MembreService]', msg, error);
    return throwError(() => new Error(msg));
  }
}
