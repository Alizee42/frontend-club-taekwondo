import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// ==== Types frontend ====
export interface LigneCommandeDTO {
  produitId: number;
  produitNom: string;
  quantite: number;
  prix: number;
  taille?: string | null;
  couleur?: string | null;
  flocage?: string | null;
  beneficiaireId?: number | null;
  beneficiairePrenom?: string | null;
  beneficiaireNom?: string | null;
}

export interface CommandeDTO {
  id: number;
  dateCommande: string;
  utilisateurId: number;
  utilisateurNom: string;
  utilisateurPrenom: string;
  utilisateurEmail: string;
  montantTotal: number;
  modePaiement: string;
  statut: string;
  lignes: LigneCommandeDTO[];
}

@Injectable({ providedIn: 'root' })
export class CommandeService {
  private apiUrl = `${environment.apiUrl}/commandes`;
  private jsonHeaders = new HttpHeaders({ 'Content-Type': 'application/json' });

  private readonly STATUT_ATTENTE = 'EN_ATTENTE';

  constructor(private http: HttpClient) {}

  /** ========================
   *      CRÉATION
   * ======================== */
  creerCommandeAvecLignes(commandeDTO: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/with-lignes`, commandeDTO, { headers: this.jsonHeaders })
      .pipe(catchError(this.handleError));
  }

  creerCommandeEnAttente(commandeDTO: any): Observable<any> {
    const commandeAvecStatut = { ...commandeDTO, statut: this.STATUT_ATTENTE };
    return this.creerCommandeAvecLignes(commandeAvecStatut);
  }

  /** ========================
   *       LECTURE
   * ======================== */
  getCommandes(): Observable<CommandeDTO[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      map(res => (res || []).map(api => this.mapApiToDto(api))),
      catchError(this.handleError)
    );
  }

  getCommandesPaiementClub(): Observable<CommandeDTO[]> {
    return this.http.get<any[]>(`${this.apiUrl}/paiement-club`).pipe(
      map(res => (res || []).map(api => this.mapApiToDto(api))),
      catchError(this.handleError)
    );
  }

  /** Commandes liées à un membre (bénéficiaire) */
  getCommandesMembre(membreId: number): Observable<CommandeDTO[]> {
    return this.http.get<any[]>(`${this.apiUrl}?scope=membre`).pipe(
      map(res => (res || [])
        .filter(cmd => (cmd.lignesCommande || []).some((l: any) => l.beneficiaireId === membreId))
        .map(api => this.mapApiToDto(api))
      ),
      catchError(this.handleError)
    );
  }

  /** Commandes d’un parent (utilisateurId) */
  getCommandesParent(parentId: number): Observable<CommandeDTO[]> {
    return this.http.get<any[]>(`${this.apiUrl}?scope=parent`).pipe(
      map(res => (res || [])
        .filter(cmd => cmd.utilisateurId === parentId)
        .map(api => this.mapApiToDto(api))
      ),
      catchError(this.handleError)
    );
  }

  /** ========================
   *       MISE À JOUR
   * ======================== */
  changerStatut(id: number, statut: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/statut`, statut, {
      headers: new HttpHeaders({ 'Content-Type': 'text/plain' })
    }).pipe(catchError(this.handleError));
  }

  validerCommande(id: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/valider`, null)
      .pipe(catchError(this.handleError));
  }

  updateCommande(commandeId: number, payload: { statut: string; modePaiement: string; datePaiement?: string }): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${commandeId}`, payload, { headers: this.jsonHeaders })
      .pipe(catchError(this.handleError));
  }

  validerPaiementManuel(id: number, modePaiement: string, datePaiement: string): Observable<void> {
    const body = { statut: 'PAYEE', modePaiement, datePaiement };
    return this.http.put<void>(`${this.apiUrl}/${id}/valider`, body, { headers: this.jsonHeaders })
      .pipe(catchError(this.handleError));
  }

  /** ========================
   *       FILTRES / STATS
   * ======================== */
  listEnAttente(): Observable<CommandeDTO[]> {
    return this.getCommandes().pipe(
      map(list => list.filter(c => c.statut === this.STATUT_ATTENTE))
    );
  }

  countEnAttente(): Observable<number> {
    return this.listEnAttente().pipe(map(list => list?.length ?? 0));
  }

  /** ========================
   *       MAPPING
   * ======================== */
  private mapApiToDto(api: any): CommandeDTO {
    return {
      id: api.id,
      dateCommande: api.dateCommande ? `${api.dateCommande}T00:00:00` : '',
      utilisateurId: api.utilisateurId,
      utilisateurNom: api.utilisateur?.nom ?? '',
      utilisateurPrenom: api.utilisateur?.prenom ?? '',
      utilisateurEmail: api.utilisateur?.email ?? '',
      montantTotal: Number(api.montantTotal ?? 0),
      modePaiement: api.modePaiement || '',
      statut: api.statut || '',
      lignes: (api.lignesCommande || []).map((l: any) => ({
        produitId: l.produitId,
        produitNom: l.produitNom ?? `Produit #${l.produitId}`,
        quantite: l.quantite,
        prix: Number(l.sousTotal ?? (l.prixUnitaire * l.quantite)),
        taille: l.taille ?? null,
        couleur: l.couleur ?? null,
        flocage: l.flocage ?? null,
        beneficiaireId: l.beneficiaireId ?? null,
        beneficiairePrenom: l.beneficiairePrenom ?? null,
        beneficiaireNom: l.beneficiaireNom ?? null,
      }))
    };
  }

  /** ========================
   *       ERRORS
   * ======================== */
  private handleError(error: HttpErrorResponse) {
    const msg = error.error instanceof ErrorEvent
      ? `Erreur: ${error.error.message}`
      : `Erreur serveur ${error.status}: ${error.message}`;
    console.error('[CommandeService]', msg, error);
    return throwError(() => new Error(msg));
  }
}
