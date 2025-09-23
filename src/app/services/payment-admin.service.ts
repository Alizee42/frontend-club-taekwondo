// src/app/services/payment-admin.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { DashboardStats } from '../models/dashboard-stats.model';
import { environment } from '../../environments/environment';

/** ---- Types utiles pour les appels ---- */
export interface EcheanceInput {
  dateEcheance: string; // ISO yyyy-MM-dd
  montant: number;
  statut?: 'en attente' | 'payé';
  numero?: number;
}

export interface NouvelUtilisateur {
  prenom: string;
  nom: string;
  email?: string;
  role: 'ADULTE' | 'PARENT';
}

export interface AjoutPaiementPayload {
  typeProfil?: 'ADULTE' | 'PARENT';
  utilisateurId?: number;
  parentId?: number;
  membreIds?: number[];
  nouvelUtilisateur?: NouvelUtilisateur;

  modePaiement: 'ESPECES' | 'VIREMENT' | 'STRIPE' | string;
  typePaiement: 'UNIQUE' | 'ECHELONNE' | 'ECHEANCES' | string;
  montantTotal: number;
  datePaiement: string; // ISO yyyy-MM-dd
  echeances?: EcheanceInput[];
  commentaire?: string;
}

export interface PaiementResponse {
  paiementId: number;
  reference?: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentAdminService {
  private readonly apiUrl = `${environment.apiUrl}/paiements`;
  private readonly userUrl = `${environment.apiUrl}/utilisateurs`;
  private readonly membreUrl = `${environment.apiUrl}/membres`;

  private dashboardStatsSubject = new BehaviorSubject<DashboardStats | null>(null);
  dashboardStats$ = this.dashboardStatsSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ----------------------------------------------------------------
  // 📊 DASHBOARD
  // ----------------------------------------------------------------

  refreshDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/dashboard`).pipe(
      tap(stats => this.dashboardStatsSubject.next(stats)),
      catchError(err => {
        console.error('[PaymentAdminService] Erreur dashboard', err);
        return throwError(() => err);
      })
    );
  }

  forceRefreshDashboard(): void {
    this.refreshDashboardStats().subscribe();
  }

  // ----------------------------------------------------------------
  // 🔎 RECHERCHE UTILISATEURS / MEMBRES
  // ----------------------------------------------------------------

  getAdultes(q?: string): Observable<any[]> {
    let params = new HttpParams().set('role', 'ADULTE');
    if (q?.trim()) params = params.set('q', q.trim());
    return this.http.get<any[]>(this.userUrl, { params });
  }

  getParents(q?: string): Observable<any[]> {
    let params = new HttpParams().set('role', 'PARENT');
    if (q?.trim()) params = params.set('q', q.trim());
    return this.http.get<any[]>(this.userUrl, { params });
  }

  getMembresByParent(parentId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.membreUrl}/by-parent/${parentId}`);
  }

  // ----------------------------------------------------------------
  // 📋 LECTURE / FILTRES PAIEMENTS
  // ----------------------------------------------------------------

  getAllPaiements(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  filterPaiements(params?: { statut?: string; modePaiement?: string }): Observable<any[]> {
    let hp = new HttpParams();
    if (params?.statut) hp = hp.set('statut', params.statut);
    if (params?.modePaiement) hp = hp.set('modePaiement', params.modePaiement);
    return this.http.get<any[]>(`${this.apiUrl}/filter`, { params: hp });
  }

  getSuiviPaiements(params?: { from?: string; to?: string; q?: string; statut?: string }): Observable<any> {
    let hp = new HttpParams();
    if (params?.from) hp = hp.set('from', params.from);
    if (params?.to) hp = hp.set('to', params.to);
    if (params?.q) hp = hp.set('q', params.q);
    if (params?.statut) hp = hp.set('statut', params.statut);
    return this.http.get<any>(`${this.apiUrl}/suivi`, { params: hp });
  }

  // ----------------------------------------------------------------
  // 💳 CREATION PAIEMENTS
  // ----------------------------------------------------------------

  ajouterPaiementManuel(payload: AjoutPaiementPayload): Observable<PaiementResponse> {
    return this.http.post<PaiementResponse>(`${this.apiUrl}/ajouter-manuel`, payload);
  }

  ajouterPaiementCompletJSON(payload: AjoutPaiementPayload): Observable<PaiementResponse> {
    return this.http.post<PaiementResponse>(`${this.apiUrl}/ajouter-complet`, payload);
  }

  uploadJustificatif(paiementId: number, file: File): Observable<any> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post(`${this.apiUrl}/${paiementId}/justificatif`, form);
  }

  // ----------------------------------------------------------------
  // 🔧 ACTIONS SUR PAIEMENTS
  // ----------------------------------------------------------------

  annulerPaiement(
    id: number,
    payload: { motif: string; dateAnnulation: string; adminResponsable: string }
  ): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}/annuler`, payload);
  }

  validerPaiement(id: number): Observable<any> {
    // ⚠️ Vérifie si ton backend attend PUT ou POST
    return this.http.put<any>(`${this.apiUrl}/${id}/valider`, {});
  }

  payerEcheances(id: number, echeanceIds: number[]): Observable<any> {
    // ⚠️ Vérifie ce que ton backend attend: [1,2,3] ou [{id:1}, {id:2}]
    return this.http.post<any>(`${this.apiUrl}/${id}/payer-echeance`, echeanceIds);
  }
}
