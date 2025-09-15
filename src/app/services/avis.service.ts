import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
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
