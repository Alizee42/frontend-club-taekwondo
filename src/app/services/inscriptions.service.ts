import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Inscription {
  id?: number;
  statut?: string;      // EN_ATTENTE_PROBATION, VALIDE, REFUSE, etc.
  evenementId?: number;
  // ...autres champs si besoin
}

@Injectable({ providedIn: 'root' })
export class InscriptionsService {
  private apiUrl = `${environment.apiUrl}/inscriptions`;

  constructor(private http: HttpClient) {}

  /** 🔹 Récupérer les inscriptions d’un événement */
  getInscriptionsByEvenement(evenementId: number): Observable<Inscription[]> {
    return this.http
      .get<Inscription[]>(`${this.apiUrl}/evenement/${evenementId}`)
      .pipe(catchError(this.handleError));
  }

  /** 🔹 Mettre à jour le statut d’une inscription */
  updateStatut(id: number, statut: string): Observable<void> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token') ?? ''}`,
      'Content-Type': 'application/json',
    });
    // PATCH avec statut en query param (comme ton backend l’attend)
    return this.http
      .patch<void>(`${this.apiUrl}/${id}/statut`, {}, { headers, params: new HttpParams().set('statut', statut) })
      .pipe(catchError(this.handleError));
  }

  /** 🔹 (Optionnel) Lister par statut */
  listByStatut(statut: string): Observable<Inscription[]> {
    const params = new HttpParams().set('statut', statut);
    return this.http
      .get<Inscription[]>(this.apiUrl, { params })
      .pipe(catchError(this.handleError));
  }

  /** 🔹 Pour le dashboard: uniquement celles en attente/probation */
  listEnAttente(): Observable<Inscription[]> {
    // change la valeur si ton backend utilise "EN_ATTENTE" ou autre
    const STATUT_ATTENTE = 'EN_ATTENTE_PROBATION';
    return this.listByStatut(STATUT_ATTENTE);
  }

  /** 🔹 Compteur pour le badge */
  countEnAttente(): Observable<number> {
    return this.listEnAttente().pipe(map(list => list?.length ?? 0));
  }

  /** ❗ Gestion erreurs */
  private handleError(error: HttpErrorResponse) {
    const msg = error.error instanceof ErrorEvent
      ? `Erreur: ${error.error.message}`
      : `Erreur serveur ${error.status}: ${error.message}`;
    console.error('[InscriptionsService]', msg, error);
    return throwError(() => new Error(msg));
  }
}
