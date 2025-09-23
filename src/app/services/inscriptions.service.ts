// src/app/services/inscriptions.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Inscription {
  id?: number;
  statut?: string;      // EN_ATTENTE_PROBATION, VALIDE, REFUSE, etc.
  evenementId?: number;
  utilisateurId?: number;
  dateInscription?: string;
}

@Injectable({ providedIn: 'root' })
export class InscriptionsService {
  private readonly apiUrl = `${environment.apiUrl}/inscriptions`;

  // 👉 Constantes statut (adaptables selon ton backend)
  private readonly STATUT_ATTENTE = 'EN_ATTENTE_PROBATION';
  private readonly STATUT_VALIDE = 'VALIDE';
  private readonly STATUT_REFUSE = 'REFUSE';

  constructor(private http: HttpClient, private auth: AuthService) {}

  /** 🔹 Récupérer les inscriptions d’un événement */
  getInscriptionsByEvenement(evenementId: number): Observable<Inscription[]> {
    return this.http
      .get<Inscription[]>(`${this.apiUrl}/evenement/${evenementId}`)
      .pipe(catchError(this.handleError));
  }

  /** 🔹 Créer une inscription */
  createInscription(inscription: Partial<Inscription>): Observable<Inscription> {
    return this.http
      .post<Inscription>(this.apiUrl, inscription, { headers: this.auth.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  /** 🔹 Mettre à jour le statut d’une inscription */
  updateStatut(id: number, statut: string): Observable<void> {
    return this.http
      .patch<void>(
        `${this.apiUrl}/${id}/statut`,
        {},
        { headers: this.auth.getAuthHeaders(), params: new HttpParams().set('statut', statut) }
      )
      .pipe(catchError(this.handleError));
  }

  /** 🔹 Lister par statut */
  listByStatut(statut: string): Observable<Inscription[]> {
    return this.http
      .get<Inscription[]>(this.apiUrl, { params: new HttpParams().set('statut', statut) })
      .pipe(catchError(this.handleError));
  }

  /** 🔹 Pour le dashboard: uniquement celles en attente/probation */
  listEnAttente(): Observable<Inscription[]> {
    return this.listByStatut(this.STATUT_ATTENTE);
  }

  /** 🔹 Compteur badge */
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
