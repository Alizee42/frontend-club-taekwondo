import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface Echeance {
  id?: number;
  dateEcheance?: string;
  montant?: number;
  statut?: string; // PAYE, EN_ATTENTE, etc.
  numero?: number;
}

export interface Paiement {
  id?: number;
  montantTotal?: number;
  statut?: string; // EN_ATTENTE, PAYE, ANNULE, etc.
  mode?: string;   // STRIPE, VIREMENT, ESPECES...
  echeances?: Echeance[];
}

@Injectable({ providedIn: 'root' })
export class PaiementService {
  private apiUrl = '/api/paiements';
  private stripeUrl = '/api/stripe/create-payment-intent';

  // 🔁 adapte si ton backend utilise EN_ATTENTE_PROBATION
  private readonly STATUT_ATTENTE = 'EN_ATTENTE';
  // private readonly STATUT_ATTENTE = 'EN_ATTENTE_PROBATION';

  constructor(private http: HttpClient) {}

  /** ------ Récupération & actions existantes ------ */
  getPaiement(id: number): Observable<Paiement> {
    return this.http.get<Paiement>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }

  payerCotisation(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/payer`, {}).pipe(catchError(this.handleError));
  }

  payerEcheance(id: number, nombreEcheances: number, montantTotalAPayer: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/payer-echeance`, { nombreEcheances, montantTotalAPayer })
      .pipe(catchError(this.handleError));
  }

  getHistoriquePaiements(id: number): Observable<Paiement[]> {
    return this.http.get<Paiement[]>(`${this.apiUrl}/${id}/historique`).pipe(catchError(this.handleError));
  }

  createPaymentIntent(request: any): Observable<any> {
    return this.http.post(this.stripeUrl, request).pipe(catchError(this.handleError));
  }

  /** ------ Spécial dashboard: "en attente/probation" ------ */

  /** Liste des paiements en attente (filtrés côté API) */
  listEnAttente(): Observable<Paiement[]> {
    const params = new HttpParams().set('statut', this.STATUT_ATTENTE);
    // si ton backend est /filter?statut=..., garde la ligne suivante :
    return this.http.get<Paiement[]>(`${this.apiUrl}/filter`, { params }).pipe(catchError(this.handleError));

    // sinon, si c’est directement /api/paiements?statut=...
    // return this.http.get<Paiement[]>(this.apiUrl, { params }).pipe(catchError(this.handleError));
  }

  /** Compteur pour le badge (nombre uniquement) */
  countEnAttente(): Observable<number> {
    return this.listEnAttente().pipe(map(list => list?.length ?? 0));
  }

  /** ------ Erreurs ------ */
  private handleError(error: HttpErrorResponse) {
    const msg = error.error instanceof ErrorEvent
      ? `Erreur: ${error.error.message}`
      : `Erreur serveur ${error.status}: ${error.message}`;
    console.error('[PaiementService]', msg, error);
    return throwError(() => new Error(msg));
  }
}
