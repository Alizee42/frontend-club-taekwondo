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
  statut?: string; 
  mode?: string;   
  echeances?: Echeance[];
}

@Injectable({ providedIn: 'root' })
export class PaiementService {
  private readonly apiUrl = `${environment.apiUrl}/paiements`;
  private readonly stripeUrl = `${environment.apiUrl}/stripe/create-payment-intent`;

  // 🔁 adapte si ton backend utilise EN_ATTENTE_PROBATION
  private readonly STATUT_ATTENTE = 'EN_ATTENTE';
  // private readonly STATUT_ATTENTE = 'EN_ATTENTE_PROBATION';

  constructor(private http: HttpClient) {}

  /** Récupérer un paiement par ID */
  getPaiement(id: number): Observable<Paiement> {
    return this.http.get<Paiement>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }

  /** Payer une cotisation */
  payerCotisation(id: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/payer`, {}).pipe(catchError(this.handleError));
  }

  /** Payer une échéance */
  payerEcheance(id: number, nombreEcheances: number, montantTotalAPayer: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/payer-echeance`, { nombreEcheances, montantTotalAPayer })
      .pipe(catchError(this.handleError));
  }

  /** Historique des paiements d’un utilisateur/membre */
  getHistoriquePaiements(id: number): Observable<Paiement[]> {
    return this.http.get<Paiement[]>(`${this.apiUrl}/${id}/historique`).pipe(catchError(this.handleError));
  }

  /** Créer un PaymentIntent Stripe */
  createPaymentIntent(request: any): Observable<any> {
    return this.http.post(this.stripeUrl, request).pipe(catchError(this.handleError));
  }

  /** Lister les paiements en attente */
  listEnAttente(): Observable<Paiement[]> {
    const params = new HttpParams().set('statut', this.STATUT_ATTENTE);
    return this.http.get<Paiement[]>(`${this.apiUrl}/filter`, { params }).pipe(catchError(this.handleError));
  }

  /** Compter les paiements en attente */
  countEnAttente(): Observable<number> {
    return this.listEnAttente().pipe(map(list => list?.length ?? 0));
  }

  /** Récupérer tous les paiements d’un club */
  getPaiementsByClub(clubId: number): Observable<Paiement[]> {
    return this.http.get<Paiement[]>(`${this.apiUrl}/club/${clubId}`)
      .pipe(catchError(this.handleError));
  }

  /** Paiements du parent connecté (avec enfants) */
  getMesPaiementsParent(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/parent/mes-paiements`)
      .pipe(catchError(this.handleError));
  }

  /** Créer un paiement côté parent */
  ajouterPaiementParent(dto: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/parent/ajouter`, dto)
      .pipe(catchError(this.handleError));
  }

  /** Obtenir l’URL de facture/reçu d’un paiement */
  getFactureUrl(paiementId: number): Observable<{ receiptUrl: string }> {
    return this.http.get<{ receiptUrl: string }>(`${this.apiUrl}/${paiementId}/facture`)
      .pipe(catchError(this.handleError));
  }

  /** Paiements du membre connecté */
  getMesPaiementsMembre(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/membre/mes-paiements`)
      .pipe(catchError(this.handleError));
  }

  /** Paiements filtrés par membreId */
  getPaiementsByMembreId(membreId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}?membreId=${membreId}`)
      .pipe(catchError(this.handleError));
  }

  /** Tous les paiements (fallback) */
  getAllPaiements(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}`)
      .pipe(catchError(this.handleError));
  }

  /** Créer un paiement côté membre */
  ajouterPaiementMembre(dto: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/ajouter-membre`, dto)
      .pipe(catchError(this.handleError));
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