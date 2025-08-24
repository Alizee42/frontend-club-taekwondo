import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { DashboardStats } from '../models/dashboard-stats.model';

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
  // Cas EXISTANTS
  typeProfil?: 'ADULTE' | 'PARENT';
  utilisateurId?: number; // si ADULTE existant
  parentId?: number;      // si PARENT existant
  membreIds?: number[];   // enfants concernés (facultatif)

  // Cas CREATION à la volée
  nouvelUtilisateur?: NouvelUtilisateur; // si présent => on ignore les IDs ci-dessus

  // Paiement
  modePaiement: 'ESPECES' | 'VIREMENT' | 'STRIPE' | string;
  /** ⚠️ côté back c’est normalisé en 'UNIQUE' | 'ECHELONNE' */
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
  /** Endpoints paiements */
  private apiUrl = '/api/paiements';
  /** Endpoints référentiel (utilisateurs/membres) */
  private refUrl = '/api';

  private dashboardStatsSubject = new BehaviorSubject<DashboardStats | null>(null);
  dashboardStats$ = this.dashboardStatsSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ----------------------------------------------------------------
  // 📊 DASHBOARD
  // ----------------------------------------------------------------

  /** 🔄 Récupère les stats et met à jour le flux */
  refreshDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/dashboard`).pipe(
      tap(stats => this.dashboardStatsSubject.next(stats))
    );
  }

  /** 🧩 Appelé après chaque ajout/annulation/validation de paiement */
  forceRefreshDashboard(): void {
    this.refreshDashboardStats().subscribe();
  }

  // ----------------------------------------------------------------
  // 🔎 RECHERCHE UTILISATEURS / MEMBRES
  // ----------------------------------------------------------------

  /** Recherche d'adultes existants (role=ADULTE) */
  getAdultes(q?: string): Observable<any[]> {
    // Si ton back ne gère pas les filtres role/q, adapte ici.
    let params = new HttpParams().set('role', 'ADULTE');
    if (q && q.trim()) params = params.set('q', q.trim());
    return this.http.get<any[]>(`${this.refUrl}/utilisateurs`, { params });
  }

  /** Recherche de parents existants (role=PARENT) */
  getParents(q?: string): Observable<any[]> {
    let params = new HttpParams().set('role', 'PARENT');
    if (q && q.trim()) params = params.set('q', q.trim());
    return this.http.get<any[]>(`${this.refUrl}/utilisateurs`, { params });
  }

  /** Enfants rattachés à un parent */
  getMembresByParent(parentId: number): Observable<any[]> {
    // Assure-toi d’avoir l’endpoint côté back: GET /api/membres/by-parent/{parentId}
    return this.http.get<any[]>(`${this.refUrl}/membres/by-parent/${parentId}`);
  }

  // ----------------------------------------------------------------
  // 📋 LECTURE / FILTRES PAIEMENTS
  // ----------------------------------------------------------------

  /** Tous les paiements (avec échéances) */
  getAllPaiements(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}`);
  }

  /** Filtres back (statut, modePaiement) -> /api/paiements/filter */
  filterPaiements(params?: { statut?: string; modePaiement?: string }): Observable<any[]> {
    let hp = new HttpParams();
    if (params?.statut) hp = hp.set('statut', params.statut);
    if (params?.modePaiement) hp = hp.set('modePaiement', params.modePaiement);
    return this.http.get<any[]>(`${this.apiUrl}/filter`, { params: hp });
  }

  /**
   * (Option) Récupération d’un “suivi” si tu as un endpoint dédié
   * Ex: GET /api/paiements/suivi?from=...&to=...&q=...&statut=...
   */
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

  /**
   * Ajout pour utilisateur/parent EXISTANT → JSON sur /ajouter-manuel
   */
  ajouterPaiementManuel(payload: any): Observable<PaiementResponse> {
    return this.http.post<PaiementResponse>(`${this.apiUrl}/ajouter-manuel`, payload);
  }

  /**
   * Création "à la volée" d'un utilisateur + paiement → JSON sur /ajouter-complet
   * ⚠️ Clés attendues par le back (PaiementRequestDTO):
   * - utilisateurNom, utilisateurPrenom, utilisateurEmail?
   * - typePaiement: 'UNIQUE' | 'ECHELONNE'
   * - montantTotal
   * - modePaiement: 'especes' | 'virement' | 'stripe' (normalisé côté back)
   * - datePaiement (yyyy-MM-dd)
   * - echeances?: [{ dateEcheance, montant, statut?, numero? }]
   */
  ajouterPaiementCompletJSON(payload: any): Observable<PaiementResponse> {
    return this.http.post<PaiementResponse>(`${this.apiUrl}/ajouter-complet`, payload);
  }

  /**
   * (Option) Upload d'un justificatif après création
   * Si tu gardes un endpoint dédié: POST /api/paiements/{id}/justificatif (multipart/form-data)
   */
  uploadJustificatif(paiementId: number, file: File): Observable<any> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post(`${this.apiUrl}/${paiementId}/justificatif`, form);
  }

  // ----------------------------------------------------------------
  // 🔧 ACTIONS SUR PAIMENTS (conformes au backend)
  // ----------------------------------------------------------------

  /** ✅ Annuler un paiement : PUT /api/paiements/{id}/annuler */
  annulerPaiement(
    id: number,
    payload: { motif: string; dateAnnulation: string; adminResponsable: string }
  ): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}/annuler`, payload);
  }

  /** ✅ Valider (marquer tout comme payé) : POST /api/paiements/{id}/valider */
  validerPaiement(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/valider`, {});
  }

  /**
   * ✅ Marquer une ou plusieurs échéances comme payées :
   * POST /api/paiements/{id}/payer-echeance
   * Body attendu (ex):
   *   [ { "id": 12 }, { "id": 13 } ]
   */
  payerEcheances(id: number, echeanceIds: number[]): Observable<any> {
    const body = (echeanceIds || []).map(eid => ({ id: eid }));
    return this.http.post<any>(`${this.apiUrl}/${id}/payer-echeance`, body);
  }
}
