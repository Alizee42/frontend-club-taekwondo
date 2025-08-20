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
  typePaiement: 'UNIQUE' | 'ECHEANCES' | string;
  montantTotal: number;
  datePaiement: string; // ISO yyyy-MM-dd
  echeances?: EcheanceInput[];
  commentaire?: string;
}

export interface PaiementResponse {
  paiementId: number;
  reference?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentAdminService {
  /** Endpoints paiements */
  private apiUrl = '/api/paiements';
  /** Endpoints référentiel (utilisateurs/membres) */
  private refUrl = '/api';

  private dashboardStatsSubject = new BehaviorSubject<DashboardStats | null>(null);
  dashboardStats$ = this.dashboardStatsSubject.asObservable();

  constructor(private http: HttpClient) {}

  /** 🔄 Récupère les stats et met à jour le flux */
  refreshDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/dashboard`).pipe(
      tap(stats => this.dashboardStatsSubject.next(stats))
    );
  }

  /** 🧩 Appelé après chaque ajout/annulation de paiement */
  forceRefreshDashboard(): void {
    this.refreshDashboardStats().subscribe(); // déclenche un push
  }

  // ----------------------------------------------------------------
  // 🔎 RECHERCHE UTILISATEURS / MEMBRES
  // ----------------------------------------------------------------

  /** Recherche d'adultes existants (role=ADULTE) */
  getAdultes(q?: string): Observable<any[]> {
    let params = new HttpParams().set('role', 'ADULTE');
    if (q && q.trim()) params = params.set('q', q.trim());
    // Attendu côté back: GET /api/utilisateurs?role=ADULTE&q=...
    return this.http.get<any[]>(`${this.refUrl}/utilisateurs`, { params });
  }

  /** Recherche de parents existants (role=PARENT) */
  getParents(q?: string): Observable<any[]> {
    let params = new HttpParams().set('role', 'PARENT');
    if (q && q.trim()) params = params.set('q', q.trim());
    // Attendu côté back: GET /api/utilisateurs?role=PARENT&q=...
    return this.http.get<any[]>(`${this.refUrl}/utilisateurs`, { params });
  }

  /** Enfants rattachés à un parent */
  getMembresByParent(parentId: number): Observable<any[]> {
    // Attendu côté back: GET /api/membres/by-parent/{parentId}
    return this.http.get<any[]>(`${this.refUrl}/membres/by-parent/${parentId}`);
  }

  // ----------------------------------------------------------------
  // 💳 PAIEMENTS
  // ----------------------------------------------------------------

  /**
   * Ajout pour utilisateur/parent EXISTANT → JSON sur /ajouter-manuel
   * (conserve l'endpoint existant côté back)
   */
  ajouterPaiementManuel(payload: any): Observable<PaiementResponse> {
    return this.http.post<PaiementResponse>(`${this.apiUrl}/ajouter-manuel`, payload);
  }

  /**
   * Création "à la volée" d'un utilisateur + paiement → FormData sur /ajouter-complet
   * ⚠️ Clés EXACTES attendues par ton Spring Controller:
   * - utilisateurNom (requis)
   * - utilisateurPrenom (requis)
   * - utilisateurEmail (optionnel)
   * - type: 'unique' | 'échelonné'  (avec accent pour l’échelonné)
   * - montantTotal
   * - modePaiement
   * - datePaiement (yyyy-MM-dd)
   * - echeances: string JSON si présent, ex: [{"dateEcheance":"2025-09-01","montant":100,"statut":"en attente","numero":1}]
   * - justificatif: File (optionnel)
   */
  ajouterPaiementCompletFormData(data: {
    utilisateurNom: string;
    utilisateurPrenom: string;
    utilisateurEmail?: string;
    type: 'unique' | 'échelonné';
    montantTotal: number | string;
    modePaiement: string;
    datePaiement: string; // yyyy-MM-dd
    echeances?: Array<{ dateEcheance: string; montant: number; statut?: string; numero?: number }>;
    justificatif?: File | null;
  }): Observable<PaiementResponse> {
    const fd = new FormData();
    fd.append('utilisateurNom', data.utilisateurNom);           // requis par le back
    fd.append('utilisateurPrenom', data.utilisateurPrenom);     // requis par le back
    if (data.utilisateurEmail) fd.append('utilisateurEmail', data.utilisateurEmail);

    fd.append('type', data.type);                                // 'unique' | 'échelonné'
    fd.append('montantTotal', String(data.montantTotal));
    fd.append('modePaiement', data.modePaiement);
    fd.append('datePaiement', data.datePaiement);

    if (data.echeances?.length) {
      fd.append('echeances', JSON.stringify(data.echeances));    // string JSON attendu
    }
    if (data.justificatif) {
      fd.append('justificatif', data.justificatif);
    }

    // Ne PAS forcer Content-Type ici: Angular gère le boundary pour multipart/form-data
    return this.http.post<PaiementResponse>(`${this.apiUrl}/ajouter-complet`, fd);
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

  /**
   * (Option) Récupération du tableau de suivi (si tu as un endpoint dédié)
   * Ex: GET /api/paiements/suivi?from=...&to=...&q=...
   */
  getSuiviPaiements(params?: { from?: string; to?: string; q?: string; statut?: string }): Observable<any> {
    let hp = new HttpParams();
    if (params?.from) hp = hp.set('from', params.from);
    if (params?.to) hp = hp.set('to', params.to);
    if (params?.q) hp = hp.set('q', params.q);
    if (params?.statut) hp = hp.set('statut', params.statut);
    return this.http.get<any>(`${this.apiUrl}/suivi`, { params: hp });
  }
}
