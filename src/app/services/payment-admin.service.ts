import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
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

/**
 * Payload "générique" côté front pour décrire l’intention.
 * Il sera converti vers le DTO exact attendu par l’API ciblée.
 */
export interface AjoutPaiementPayload {
  // Cas EXISTANTS
  typeProfil?: 'ADULTE' | 'PARENT';
  utilisateurId?: number; // si ADULTE existant (ou parent existant)
  parentId?: number;      // si PARENT existant (alias possible pour utilisateurId)
  membreIds?: number[];   // enfants concernés (facultatif; si plusieurs → 1 req par enfant)

  // Cas CREATION à la volée (si présent => on ignore les IDs ci-dessus)
  nouvelUtilisateur?: NouvelUtilisateur;

  // Paiement
  modePaiement: 'ESPECES' | 'VIREMENT' | 'STRIPE' | 'CB' | string;
  typePaiement: 'UNIQUE' | 'ECHEANCES' | 'ECHELONNE' | string;
  montantTotal: number;
  datePaiement?: string; // côté /ajouter-manuel pris en compte; /ajouter-complet JSON fixe la date côté serveur
  echeances?: EcheanceInput[];
  commentaire?: string;
}

/** Réponse minimale après création */
export interface PaiementResponse {
  paiementId: number;
  reference?: string;
}

/** DTO minimal pour mapper la réponse des listes */
export interface PaiementDTO {
  id: number;
  type: 'UNIQUE' | 'ECHELONNE' | 'COTISATION';
  modePaiement: 'CB' | 'VIREMENT' | 'ESPECES' | string;
  statut: 'payé' | 'en attente' | 'en retard' | 'annulé' | string;
  datePaiement: string; // yyyy-MM-dd
  montantTotal: number;
  montantPaye: number;
  montantRestant: number;
  utilisateurId?: number;
  utilisateurNom?: string;
  utilisateurPrenom?: string;
  membreId?: number;
  membreNom?: string;
  membrePrenom?: string;
  echeances?: Array<{
    id?: number;
    numero?: number;
    dateEcheance: string;
    montant: number;
    statut: 'en attente' | 'payé' | string;
  }>;
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
  // 📋 SUIVI / LISTES
  // ----------------------------------------------------------------

  /** Liste complète pour le tableau de suivi */
  getAllPaiements(): Observable<PaiementDTO[]> {
    return this.http.get<PaiementDTO[]>(`${this.apiUrl}`);
  }

  /** Filtrer par statut et/ou mode */
  filterPaiements(params?: { statut?: string; modePaiement?: string }): Observable<PaiementDTO[]> {
    let hp = new HttpParams();
    if (params?.statut) hp = hp.set('statut', params.statut);
    if (params?.modePaiement) hp = hp.set('modePaiement', params.modePaiement);
    return this.http.get<PaiementDTO[]>(`${this.apiUrl}/filter`, { params: hp });
  }

  // ----------------------------------------------------------------
  // 💳 ACTIONS SUR UN PAIEMENT
  // ----------------------------------------------------------------

  /** Marquer une ou plusieurs échéances comme payées */
  payerEcheances(paiementId: number, echeanceIds: number[]): Observable<PaiementDTO> {
    // Le back attend: POST /{id}/payer-echeance  body: [{ id: <echeanceId> }, ...]
    const body = (echeanceIds || []).map(id => ({ id }));
    return this.http.post<PaiementDTO>(`${this.apiUrl}/${paiementId}/payer-echeance`, body);
  }

  /** Valider un paiement (le passer en "payé") */
  validerPaiement(paiementId: number): Observable<PaiementDTO> {
    return this.http.post<PaiementDTO>(`${this.apiUrl}/${paiementId}/valider`, {});
  }

  /** Annuler un paiement (si endpoint présent côté back) */
  annulerPaiement(paiementId: number, payload?: { motif?: string }): Observable<PaiementDTO> {
    // Si ton back expose PUT /api/paiements/{id}/annuler
    return this.http.put<PaiementDTO>(`${this.apiUrl}/${paiementId}/annuler`, payload || {});
  }

  /** Supprimer un paiement */
  deletePaiement(paiementId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${paiementId}`);
  }

  // ----------------------------------------------------------------
  // 🧱 HELPERS de NORMALISATION
  // ----------------------------------------------------------------

  /** Le back attend "CB" | "VIREMENT" | "ESPECES" */
  private toApiMode(mode: string): 'CB' | 'VIREMENT' | 'ESPECES' | string {
    const m = (mode || '').toUpperCase();
    if (m === 'STRIPE') return 'CB'; // On mappe STRIPE → CB
    if (m === 'CB' || m === 'VIREMENT' || m === 'ESPECES') return m;
    return mode;
  }

  /** Le back attend "UNIQUE" | "ECHELONNE" (pas "ECHEANCES") */
  private toApiType(type: string): 'UNIQUE' | 'ECHELONNE' | 'COTISATION' | string {
    const t = (type || '').toUpperCase();
    if (t === 'ECHEANCES') return 'ECHELONNE';
    if (t === 'ECHELONNE' || t === 'UNIQUE' || t === 'COTISATION') return t;
    return type;
  }

  private mapEcheancesToDto(eches?: EcheanceInput[]): Array<{ dateEcheance: string; montant: number; numero?: number; statut?: string }> | undefined {
    if (!eches || !eches.length) return undefined;
    return eches.map((e, i) => ({
      numero: e.numero ?? i + 1,
      dateEcheance: e.dateEcheance,
      montant: e.montant,
      statut: e.statut ?? 'en attente'
    }));
  }

  // ----------------------------------------------------------------
  // 💳 CREATION — 2 chemins supportés par ton back
  // ----------------------------------------------------------------

  /**
   * (A) Ajout "manuel" JSON → /ajouter-manuel
   * Attend un JSON de type PaiementDTO (côté back) :
   * {
   *   type, modePaiement, montantTotal, datePaiement?,
   *   utilisateurId? | (utilisateurNom, utilisateurPrenom, utilisateurEmail?),
   *   membreId,
   *   echeances?: [{ numero?, dateEcheance, montant, statut? }]
   * }
   * - Si utilisateurId absent mais utilisateurNom/prenom fournis, le back crée le parent automatiquement.
   * - ⚠️ membreId est OBLIGATOIRE.
   */
  ajouterPaiementManuel(payload: AjoutPaiementPayload & { membreId?: number }): Observable<PaiementDTO> {
    const body: any = {
      type: this.toApiType(payload.typePaiement),
      modePaiement: this.toApiMode(payload.modePaiement),
      montantTotal: payload.montantTotal,
      datePaiement: payload.datePaiement, // optionnel côté serveur
      utilisateurId: payload.utilisateurId ?? payload.parentId,
      membreId: payload['membreId'] || (payload.membreIds?.length ? payload.membreIds[0] : undefined),
      echeances: this.mapEcheancesToDto(payload.echeances)
    };

    // Création parent à la volée via /ajouter-manuel (le service back sait le créer)
    if (!body.utilisateurId && payload.nouvelUtilisateur) {
      body.utilisateurNom = payload.nouvelUtilisateur.nom;
      body.utilisateurPrenom = payload.nouvelUtilisateur.prenom;
      if (payload.nouvelUtilisateur.email) body.utilisateurEmail = payload.nouvelUtilisateur.email;
    }

    return this.http.post<PaiementDTO>(`${this.apiUrl}/ajouter-manuel`, body);
  }

  /**
   * (B) Ajout "complet" JSON → /ajouter-complet
   * Attend un JSON de type PaiementRequestDTO (côté back) :
   * {
   *   montantTotal, modePaiement("CB"|"VIREMENT"|"ESPECES"), typePaiement("UNIQUE"|"ECHELONNE"),
   *   nombreEcheances?, utilisateurId, membreId? | newMembre?, echeances?: [...]
   * }
   * - Ici, il faut un utilisateurId (parent/adulte) EXISTANT.
   * - Pour un enfant "à la volée", utilise `newMembre` (si supporté dans ton DTO).
   */
  ajouterPaiementCompletJSON(payload: AjoutPaiementPayload & { membreId?: number; newMembre?: { prenom: string; nom: string; dateNaissance?: string } }): Observable<PaiementDTO> {
    const body: any = {
      montantTotal: payload.montantTotal,
      modePaiement: this.toApiMode(payload.modePaiement),
      typePaiement: this.toApiType(payload.typePaiement),
      utilisateurId: payload.utilisateurId ?? payload.parentId,
      membreId: payload['membreId'] || (payload.membreIds?.length ? payload.membreIds[0] : undefined),
      echeances: this.mapEcheancesToDto(payload.echeances),
      // nombreEcheances est déduit du tableau si fourni
      nombreEcheances: payload.echeances?.length || undefined
    };

    // newMembre si on veut créer l’enfant à la volée (si supporté par le DTO côté back)
    if (!body.membreId && (payload as any).newMembre) {
      body.newMembre = (payload as any).newMembre;
    }

    if (!body.utilisateurId) {
      throw new Error('ajouterPaiementCompletJSON → utilisateurId/parentId requis (le back attend un utilisateur EXISTANT).');
    }

    return this.http.post<PaiementDTO>(`${this.apiUrl}/ajouter-complet`, body);
  }

  // ----------------------------------------------------------------
  // 📎 (Option) Variante multipart si tu conserves un second endpoint
  // ----------------------------------------------------------------
  /**
   * Si tu gardes un endpoint distinct "multipart":
   *   POST /api/paiements/ajouter-complet-form-data (multipart/form-data)
   * …alors tu peux réutiliser cette méthode.
   */
  ajouterPaiementCompletMultipart(data: {
    utilisateurNom?: string;
    utilisateurPrenom?: string;
    utilisateurEmail?: string;
    utilisateurId?: number;
    membreId?: number;
    type: 'unique' | 'échelonné';
    montantTotal: number | string;
    modePaiement: string;
    datePaiement?: string; // yyyy-MM-dd
    echeances?: Array<{ dateEcheance: string; montant: number; statut?: string; numero?: number }>;
    justificatif?: File | null;
  }): Observable<PaiementResponse> {
    const fd = new FormData();

    if (data.utilisateurId != null) fd.append('utilisateurId', String(data.utilisateurId));
    if (data.utilisateurNom) fd.append('utilisateurNom', data.utilisateurNom);
    if (data.utilisateurPrenom) fd.append('utilisateurPrenom', data.utilisateurPrenom);
    if (data.utilisateurEmail) fd.append('utilisateurEmail', data.utilisateurEmail);
    if (data.membreId != null) fd.append('membreId', String(data.membreId));

    fd.append('type', data.type); // 'unique' | 'échelonné'
    fd.append('montantTotal', String(data.montantTotal));
    fd.append('modePaiement', data.modePaiement);
    if (data.datePaiement) fd.append('datePaiement', data.datePaiement);

    if (data.echeances?.length) {
      fd.append('echeances', JSON.stringify(data.echeances));
    }
    if (data.justificatif) {
      fd.append('justificatif', data.justificatif);
    }

    // 👉 Attention: cet endpoint n’existe pas par défaut dans ton controller actuel
    return this.http.post<PaiementResponse>(`${this.apiUrl}/ajouter-complet-form-data`, fd);
  }

  // ----------------------------------------------------------------
  // 🧰 Orchestrations pratiques pour le front (facultatif)
  // ----------------------------------------------------------------

  /**
   * Ajoute un paiement pour CHAQUE enfant d’un tableau `membreIds`.
   * Utilise /ajouter-manuel (pratique si tu dois créer le parent via nom/prénom).
   */
  ajouterPaiementPourPlusieursMembres(payload: AjoutPaiementPayload & { membreIds: number[] }): Observable<PaiementDTO[]> {
    const calls = payload.membreIds.map(membreId =>
      this.ajouterPaiementManuel({ ...payload, membreId })
    );
    // On exécute en série pour garder un ordre (simple) : reduce enchaîné
    return calls.reduce((acc$, next$) =>
      acc$.pipe(
        catchError(() => of([] as PaiementDTO[])),
        // @ts-ignore — on “concatène” simplement les réponses
        switchMap((accList: PaiementDTO[]) =>
          next$.pipe(
            map((one: PaiementDTO) => [...accList, one]),
            catchError(() => of(accList))
          )
        )
      ),
      of([] as PaiementDTO[])
    );
  }
  // ⬇️ AJOUTER dans PaymentAdminService
ajouterPaiementCompletFormData(data: {
  utilisateurNom: string;
  utilisateurPrenom: string;
  utilisateurEmail?: string;
  type: 'unique' | 'échelonné';
  montantTotal: number | string;
  modePaiement: string;          // 'especes' | 'virement' | 'stripe'
  datePaiement: string;          // yyyy-MM-dd
  echeances?: Array<{ dateEcheance: string; montant: number; statut?: string; numero?: number }>;
  justificatif?: File | null;
}) {
  const fd = new FormData();
  fd.append('utilisateurNom', data.utilisateurNom);
  fd.append('utilisateurPrenom', data.utilisateurPrenom);
  if (data.utilisateurEmail) fd.append('utilisateurEmail', data.utilisateurEmail);

  fd.append('type', data.type); // 'unique' | 'échelonné'
  fd.append('montantTotal', String(data.montantTotal));
  fd.append('modePaiement', data.modePaiement);
  fd.append('datePaiement', data.datePaiement);

  if (data.echeances?.length) {
    fd.append('echeances', JSON.stringify(data.echeances));
  }
  if (data.justificatif) {
    fd.append('justificatif', data.justificatif);
  }

  return this.http.post(`${this.apiUrl}/ajouter-complet`, fd);
}

}
