// src/app/services/avis.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Avis {
  id?: number;
  contenu: string;
  pseudoVisiteur: string;
  approuve: boolean;   // false = en attente de validation
  note: number;
  typeAvis?: string;
  datePub?: string;
  photo?: string;
}

@Injectable({ providedIn: 'root' })
export class AvisService {
  private readonly apiUrl = `${environment.apiUrl}/avis`;

  constructor(private http: HttpClient) {}

  /** 🔹 Récupérer tous les avis (optionnellement filtrés par approuve) */
  getAvis(approuve?: boolean): Observable<Avis[]> {
    let params = new HttpParams();
    if (typeof approuve === 'boolean') {
      params = params.set('approuve', String(approuve));
    }
    return this.http.get<Avis[]>(this.apiUrl, { params }).pipe(
      catchError(this.handleError)
    );
  }

  /** 🔹 Avis en attente de validation */
  getAvisNonApprouves(): Observable<Avis[]> {
    return this.getAvis(false);
  }

  /** 🔹 Compteur d’avis non approuvés */
  countNonApprouves(): Observable<number> {
    return this.getAvis(false).pipe(map(list => list?.length ?? 0));
  }

  /** 🔹 Ajouter un avis (FormData supporté pour photo) */
  ajouterAvis(formData: FormData): Observable<Avis> {
    return this.http.post<Avis>(this.apiUrl, formData).pipe(
      catchError(this.handleError)
    );
  }

  /** 🔹 Mettre à jour un avis */
  updateAvis(id: number, avis: Avis): Observable<Avis> {
    return this.http.put<Avis>(`${this.apiUrl}/${id}`, avis).pipe(
      catchError(this.handleError)
    );
  }

  /** 🔹 Supprimer un avis */
  deleteAvis(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /** 🔹 Approuver un avis */
  approuverAvis(id: number): Observable<Avis> {
    return this.http.put<Avis>(`${this.apiUrl}/${id}/approuver`, {}).pipe(
      catchError(this.handleError)
    );
  }

  /** 🔹 Gestion centralisée des erreurs */
  private handleError(error: HttpErrorResponse) {
    const msg = error.error instanceof ErrorEvent
      ? `Erreur: ${error.error.message}`
      : `Erreur serveur ${error.status}: ${error.message}`;
    console.error('[AvisService]', msg, error);
    return throwError(() => new Error(msg));
  }
}
