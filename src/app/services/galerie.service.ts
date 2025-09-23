// src/app/services/galerie.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Galerie {
  id?: string;
  titre: string;
  imageUrl: string;
  description: string;
  datePublication?: string;
}

@Injectable({ providedIn: 'root' })
export class GalerieService {
  private readonly apiUrl = `${environment.apiUrl}/galerie`;

  constructor(private http: HttpClient) {}

  /** 🔹 Récupérer toutes les galeries */
  getAll(): Observable<Galerie[]> {
    return this.http.get<Galerie[]>(this.apiUrl).pipe(catchError(this.handleError));
  }

  /** 🔹 Récupérer une galerie par ID */
  getById(id: string): Observable<Galerie> {
    return this.http.get<Galerie>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }

  /** 🔹 Créer une galerie */
  create(galerie: Galerie | FormData): Observable<Galerie> {
    return this.http.post<Galerie>(this.apiUrl, galerie).pipe(catchError(this.handleError));
  }

  /** 🔹 Mettre à jour une galerie */
  update(id: string, galerie: Galerie | FormData): Observable<Galerie> {
    return this.http.put<Galerie>(`${this.apiUrl}/${id}`, galerie).pipe(catchError(this.handleError));
  }

  /** 🔹 Supprimer une galerie */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }

  /** 🔹 Gestion centralisée des erreurs */
  private handleError(error: HttpErrorResponse) {
    const msg = error.error instanceof ErrorEvent
      ? `Erreur: ${error.error.message}`
      : `Erreur serveur ${error.status}: ${error.message}`;
    console.error('[GalerieService]', msg, error);
    return throwError(() => new Error(msg));
  }
}
