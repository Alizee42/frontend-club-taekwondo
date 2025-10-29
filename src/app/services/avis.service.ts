import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Avis {
  id?: number;
  contenu: string;
  pseudoVisiteur: string;
  approuve: boolean;       // false => en attente de probation/validation
  note: number;
  typeAvis?: string;
  datePub?: string;
  photo?: string;
}

@Injectable({ providedIn: 'root' })
export class AvisService {
  private readonly apiUrl = `${environment.apiUrl}/avis`;

  constructor(private http: HttpClient) {}

  /** Tous les avis (optionnellement filtrés par approuve) */
  getAvis(approuve?: boolean): Observable<Avis[]> {
    let params = new HttpParams();
    if (typeof approuve === 'boolean') {
      params = params.set('approuve', String(approuve));
    }
    return this.http.get<Avis[]>(this.apiUrl, { params }).pipe(
      catchError(this.handleError)
    );
  }

  /** Avis non approuvés (en attente de probation/validation) */
  getAvisNonApprouves(): Observable<Avis[]> {
    return this.getAvis(false);
  }

  /** Compte pour le badge : nombre d’avis non approuvés */
  countNonApprouves(): Observable<number> {
    return this.getAvis(false).pipe(
      map(list => list?.length ?? 0)
    );
  }

  /** Ajout d’un avis (FormData supporté) */
  ajouterAvis(formData: FormData): Observable<Avis> {
    return this.http.post<Avis>(this.apiUrl, formData).pipe(
      catchError(this.handleError)
    );
  }

  /** Récupérer les avis d'un club */
  getAvisParClub(clubId: number|string, approuve?: boolean): Observable<Avis[]> {
    // If caller requests only approved avis, some backend versions may not support
    // filtering by 'approuve' on the /club/{id} endpoint. In that case we call the
    // global endpoint with approuve=true and filter by clubId client-side.
    if (approuve === true) {
      return this.getAvis(true).pipe(
        tap(list => console.log('[AvisService] getAvis(true) returned', (list || []).length, 'items')),
        // log a small JSON sample to inspect shape
        tap(list => console.log('[AvisService] payload sample', JSON.stringify((list || []).slice(0,5)))),
        map(list => (list || []).filter(a => {
          const anyA = a as any;
          const candidate = anyA?.clubId ?? anyA?.club?.id ?? anyA?.club ?? anyA?.club_id ?? anyA?.clubID ?? null;
          // Compare numerically to avoid string/number mismatches
          const cid = candidate == null ? null : Number(candidate);
          return cid != null && !Number.isNaN(cid) && Number(cid) === Number(clubId);
        })),
        tap(filtered => console.log('[AvisService] filtered by clubId', clubId, '->', (filtered || []).length, 'items')),
        catchError(this.handleError)
      );
    }

    // Otherwise call the dedicated club endpoint (backend may support additional filtering)
    const url = `${this.apiUrl}/club/${clubId}`;
    let params = new HttpParams();
    if (typeof approuve === 'boolean') {
      params = params.set('approuve', String(approuve));
    }
    return this.http.get<Avis[]>(url, { params }).pipe(
      catchError(this.handleError)
    );
  }

  /** Ajouter un avis à un club (super-admin) */
  addAvisToClub(clubId: number|string, avis: Partial<Avis>) {
    return this.http.post<Avis>(`${this.apiUrl}?clubId=${clubId}`, avis).pipe(
      catchError(this.handleError)
    );
  }

  /** Modifier un avis */
  updateAvis(avis: Partial<Avis>) {
    if (!avis.id) throw new Error('ID avis requis');
    return this.http.put<Avis>(`${this.apiUrl}/${avis.id}`, avis).pipe(
      catchError(this.handleError)
    );
  }

  /** Supprimer un avis */
  deleteAvis(avisId: number) {
    return this.http.delete(`${this.apiUrl}/${avisId}`).pipe(
      catchError(this.handleError)
    );
  }

  /** Approuver un avis (endpoint dédié) */
  approuverAvis(id: number) {
    return this.http.put<Avis>(`${this.apiUrl}/${id}/approuver`, {}).pipe(
      catchError(this.handleError)
    );
  }

  /** Refuser / annuler un avis (suppression) */
  refuserAvis(id: number) {
    return this.deleteAvis(id);
  }

  // (facultatif) Exemple d’approbation si tu as un endpoint dédié :
  // approuver(id: number): Observable<Avis> {
  //   return this.http.put<Avis>(`${this.apiUrl}/${id}/approuver`, {}).pipe(
  //     catchError(this.handleError)
  //   );
  // }

  private handleError(error: HttpErrorResponse) {
    const msg = error.error instanceof ErrorEvent
      ? `Erreur: ${error.error.message}`
      : `Erreur serveur ${error.status}: ${error.message}`;
    console.error('[AvisService]', msg, error);
    return throwError(() => new Error(msg));
  }
}