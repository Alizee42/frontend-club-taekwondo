import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Commande {
  id?: number;
  statut?: string;        // EN_ATTENTE, EN_ATTENTE_PROBATION, PAYEE, ANNULEE, RETIREE, ...
  modePaiement?: string;  // CB, VIREMENT, ESPECES...
  datePaiement?: string;
  // ...autres champs utiles
}

@Injectable({ providedIn: 'root' })
export class CommandeService {
  private apiUrl = `${environment.apiUrl}/commandes`;
  private jsonHeaders = new HttpHeaders({ 'Content-Type': 'application/json' });

  // 👉 change ici si ton backend utilise EN_ATTENTE_PROBATION
  private readonly STATUT_ATTENTE = 'EN_ATTENTE';
  // private readonly STATUT_ATTENTE = 'EN_ATTENTE_PROBATION';

  constructor(private http: HttpClient) {}

  /** Créer une commande avec ses lignes */
  creerCommandeAvecLignes(commandeDTO: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/with-lignes`, commandeDTO, { headers: this.jsonHeaders })
      .pipe(catchError(this.handleError));
  }

  /** Créer une commande en attente */
  creerCommandeEnAttente(commandeDTO: any): Observable<any> {
    const commandeAvecStatut = { ...commandeDTO, statut: this.STATUT_ATTENTE };
    return this.creerCommandeAvecLignes(commandeAvecStatut);
  }

  /** Récupérer toutes les commandes */
  getCommandes(): Observable<Commande[]> {
    return this.http.get<Commande[]>(this.apiUrl).pipe(catchError(this.handleError));
  }

  /** Récupérer un utilisateur par ID */
  getUtilisateur(utilisateurId: number): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/utilisateurs/${utilisateurId}`)
      .pipe(catchError(this.handleError));
  }  

  /** Changer uniquement le statut d'une commande */
  changerStatut(id: number, statut: string): Observable<void> {
    // Variante A (query param, corps vide) — fréquente côté Spring
    return this.http.put<void>(`${this.apiUrl}/${id}/statut`, {}, {
      headers: this.jsonHeaders,
      params: new HttpParams().set('statut', statut)
    }).pipe(catchError(this.handleError));

    // Variante B (si ton backend attend du texte brut) :
    // return this.http.put<void>(`${this.apiUrl}/${id}/statut`, statut, {
    //   headers: new HttpHeaders({ 'Content-Type': 'text/plain' })
    // }).pipe(catchError(this.handleError));
  }

  /** Valider une commande (paiement confirmé) */
  validerCommande(id: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/valider/${id}`, null)
      .pipe(catchError(this.handleError));
  }

  /** Mise à jour complète (statut + modePaiement) */
  updateCommande(commandeId: number, payload: { statut: string; modePaiement: string }): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${commandeId}`, payload, { headers: this.jsonHeaders })
      .pipe(catchError(this.handleError));
  }

  /** Upload d'un justificatif de paiement */
  uploadJustificatif(commandeId: number, formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/${commandeId}/justificatif`, formData)
      .pipe(catchError(this.handleError));
  }

  /** Mise à jour paiement (statut, modePaiement, datePaiement) */
  mettreAJourPaiementCommande(id: number, updateDTO: any): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, updateDTO, { headers: this.jsonHeaders })
      .pipe(catchError(this.handleError));
  }

  /** Récupérer les commandes à payer au club */
  getCommandesPaiementClub(): Observable<Commande[]> {
    return this.http.get<Commande[]>(`${this.apiUrl}/paiement-club`)
      .pipe(catchError(this.handleError));
  }

  /** Valider manuellement un paiement au club (espèces/virement) */
  validerPaiementManuel(id: number, modePaiement: string, datePaiement: string): Observable<void> {
    const body = { statut: 'PAYEE', modePaiement, datePaiement };
    return this.http.put<void>(`${this.apiUrl}/${id}/valider`, body, { headers: this.jsonHeaders })
      .pipe(catchError(this.handleError));
  }

  /* =======================
     Spécial DASHBOARD badges
     ======================= */

  /** Lister par statut (2 variantes selon ton backend) */
  listByStatut(statut: string): Observable<Commande[]> {
    const params = new HttpParams().set('statut', statut);

    // Variante A : /filter?statut=...
    return this.http.get<Commande[]>(`${this.apiUrl}/filter`, { params })
      .pipe(catchError(this.handleError));

    // Variante B si ton controller accepte directement /api/commandes?statut=...
    // return this.http.get<Commande[]>(this.apiUrl, { params }).pipe(catchError(this.handleError));
  }

  /** Seulement celles en attente/probation */
  listEnAttente(): Observable<Commande[]> {
    return this.listByStatut(this.STATUT_ATTENTE);
  }

  /** Compteur badge */
  countEnAttente(): Observable<number> {
    return this.listEnAttente().pipe(map(list => list?.length ?? 0));
  }

  /* ===== Errors ===== */
  private handleError(error: HttpErrorResponse) {
    const msg = error.error instanceof ErrorEvent
      ? `Erreur: ${error.error.message}`
      : `Erreur serveur ${error.status}: ${error.message}`;
    console.error('[CommandeService]', msg, error);
    return throwError(() => new Error(msg));
  }
}