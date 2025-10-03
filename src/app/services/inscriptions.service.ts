import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Inscription {
  id?: number;
  statut?: string;       // EN_ATTENTE, VALIDE, REFUSE, etc.
  evenementId?: number;
  utilisateurId?: number;
  dateInscription?: string;
  commentaire?: string;

  // Champs supplémentaires du backend
  utilisateurNom?: string;
  utilisateurPrenom?: string;
  utilisateurEmail?: string;
  evenementTitre?: string;

  // Champs pour compatibilité backend DTO
  membreNom?: string;
  membrePrenom?: string;
  membreEmail?: string;
}

@Injectable({ providedIn: 'root' })
export class InscriptionsService {
  private readonly apiUrl = `${environment.apiUrl}/inscriptions`;

  constructor(private http: HttpClient) {}

  /** 🔹 Créer une nouvelle inscription */
  inscrireUtilisateur(evenementId: number, utilisateurId: number, commentaire?: string): Observable<Inscription> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token') ?? ''}`,
      'Content-Type': 'application/json',
    });

    return this.http
      .post<Inscription>(
        this.apiUrl,
        { evenementId, utilisateurId, commentaire },
        { headers }
      )
      .pipe(catchError(this.handleError));
  }

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

    return this.http
      .patch<void>(
        `${this.apiUrl}/${id}/statut`,
        {},
        { headers, params: new HttpParams().set('statut', statut) }
      )
      .pipe(catchError(this.handleError));
  }

  /** 🔹 Annuler une inscription (désinscription) */
  annulerInscription(inscriptionId: number): Observable<void> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token') ?? ''}`,
    });

    return this.http
      .delete<void>(`${this.apiUrl}/${inscriptionId}`, { headers })
      .pipe(catchError(this.handleError));
  }

  /** 🔹 Lister par statut */
  listByStatut(statut: string): Observable<Inscription[]> {
    const params = new HttpParams().set('statut', statut);
    return this.http
      .get<Inscription[]>(this.apiUrl, { params })
      .pipe(catchError(this.handleError));
  }

  /** 🔹 Pour le dashboard: uniquement celles en attente */
  listEnAttente(): Observable<Inscription[]> {
    const STATUT_ATTENTE = 'EN_ATTENTE'; // ✅ ton backend utilise bien EN_ATTENTE
    return this.listByStatut(STATUT_ATTENTE);
  }

  /** 🔹 Compteur pour le badge */
  countEnAttente(): Observable<number> {
    return this.listEnAttente().pipe(map(list => list?.length ?? 0));
  }

  /** ❗ Gestion erreurs */
  private handleError(error: HttpErrorResponse) {
    const msg =
      error.error instanceof ErrorEvent
        ? `Erreur: ${error.error.message}`
        : `Erreur serveur ${error.status}: ${error.message}`;
    console.error('[InscriptionsService]', msg, error);
    return throwError(() => new Error(msg));
  }
}
