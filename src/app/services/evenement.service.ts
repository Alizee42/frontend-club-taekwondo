// src/app/services/evenement.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Evenement {
  id?: number;
  titre: string;
  description: string;
  date: string;
  lieu?: string;
  imageUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class EvenementService {
  private readonly apiUrl = `${environment.apiUrl}/evenements`;

  constructor(private http: HttpClient) {}

  /** 🔹 Récupérer tous les événements */
  getAllEvenements(): Observable<Evenement[]> {
    return this.http.get<Evenement[]>(this.apiUrl).pipe(catchError(this.handleError));
  }

  /** 🔹 Récupérer un événement par ID */
  getById(id: number): Observable<Evenement> {
    return this.http.get<Evenement>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }

  /** 🔹 Ajouter un événement (avec image via FormData) */
  ajouterEvenement(formData: FormData): Observable<Evenement> {
    return this.http.post<Evenement>(this.apiUrl, formData).pipe(catchError(this.handleError));
  }

  /** 🔹 Mettre à jour un événement */
  updateEvenement(id: number, formData: FormData): Observable<Evenement> {
    return this.http.put<Evenement>(`${this.apiUrl}/${id}`, formData).pipe(catchError(this.handleError));
  }

  /** 🔹 Supprimer un événement */
  supprimerEvenement(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }

  /** 🔹 Gestion centralisée des erreurs */
  private handleError(error: HttpErrorResponse) {
    const msg = error.error instanceof ErrorEvent
      ? `Erreur: ${error.error.message}`
      : `Erreur serveur ${error.status}: ${error.message}`;
    console.error('[EvenementService]', msg, error);
    return throwError(() => new Error(msg));
  }
}
