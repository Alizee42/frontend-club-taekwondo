// src/app/services/paiement.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Echeance {
  id?: number;
  dateEcheance?: string;
  montant?: number;
  statut?: string; 
  numero?: number;
}

export interface Paiement {
  id?: number;
  montantTotal?: number;
  statut?: string;      // EN_ATTENTE, PAYE, ANNULE, etc.
  mode?: string;        // CB, VIREMENT, ESPECES
  echeances?: Echeance[];
}

@Injectable({ providedIn: 'root' })
export class PaiementService {
  private readonly apiUrl = `${environment.apiUrl}/paiements`;
  private readonly stripeUrl = `${environment.apiUrl}/stripe/create-payment-intent`;

  // 👉 Adapte ces valeurs selon ton backend
  private readonly STATUT_ATTENTE = 'EN_ATTENTE';
  private readonly STATUT_PAYE = 'PAYE';
  private readonly STATUT_ANNULE = 'ANNULE';

  constructor(private http: HttpClient) {}

  /** 🔹 Récupérer un paiement par ID */
  getPaiement(id: number): Observable<Paiement> {
    return this.http.get<Paiement>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }

  /** 🔹 Payer une cotisation */
  payerCotisation(id: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/payer`, {}).pipe(catchError(this.handleError));
  }

  /** 🔹 Payer une échéance */
  payerEcheance(id: number, nombreEcheances: number, montantTotalAPayer: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/payer-echeance`, { nombreEcheances, montantTotalAPayer })
      .pipe(catchError(this.handleError));
  }

  /** 🔹 Historique des paiements d’un utilisateur/membre */
  getHistoriquePaiements(id: number): Observable<Paiement[]> {
    return this.http.get<Paiement[]>(`${this.apiUrl}/${id}/historique`).pipe(catchError(this.handleError));
  }

  /** 🔹 Créer un PaymentIntent Stripe */
  createPaymentIntent(request: any): Observable<any> {
    return this.http.post(this.stripeUrl, request).pipe(catchError(this.handleError));
  }

  /** 🔹 Lister les paiements en attente */
  listEnAttente(): Observable<Paiement[]> {
    const params = new HttpParams().set('statut', this.STATUT_ATTENTE);
    return this.http.get<Paiement[]>(`${this.apiUrl}/filter`, { params }).pipe(catchError(this.handleError));
  }

  /** 🔹 Compter les paiements en attente */
  countEnAttente(): Observable<number> {
    return this.listEnAttente().pipe(map(list => list?.length ?? 0));
  }

  /** 🔹 Valider un paiement (côté admin) */
  validerPaiement(id: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/valider`, {}).pipe(catchError(this.handleError));
  }

  /** 🔹 Annuler un paiement */
  annulerPaiement(id: number, motif?: string): Observable<void> {
    const body = motif ? { motif } : {};
    return this.http.put<void>(`${this.apiUrl}/${id}/annuler`, body).pipe(catchError(this.handleError));
  }

  /** 🔹 Ajouter un paiement manuel (espèces, virement, etc.) */
  ajouterPaiementManuel(paiement: any): Observable<Paiement> {
    return this.http.post<Paiement>(`${this.apiUrl}/ajouter-manuel`, paiement).pipe(catchError(this.handleError));
  }

  /* ===== Gestion des erreurs ===== */
  private handleError(error: HttpErrorResponse) {
    const msg = error.error instanceof ErrorEvent
      ? `Erreur: ${error.error.message}`
      : `Erreur serveur ${error.status}: ${error.message}`;
    console.error('[PaiementService]', msg, error);
    return throwError(() => new Error(msg));
  }
}
