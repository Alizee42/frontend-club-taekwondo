import { tap } from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Galerie {
  id?: string;
  titre: string;
  imageUrl: string;
  description: string;
  datePublication?: string;
  clubId?: number;
}

@Injectable({
  providedIn: 'root',
})
export class GalerieService {
  /** Emitted when galleries change (create/update/delete) so UI can refresh */
  readonly imagesUpdated$ = new Subject<void>();
  /** Récupère toutes les galeries d'un club */
  getGaleriesByClub(clubId: number): Observable<Galerie[]> {
    return this.http.get<Galerie[]>(`${this.apiUrl}/club/${clubId}`);
  }
  private readonly apiUrl = `${environment.apiUrl}/galeries`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  getAll(): Observable<Galerie[]> {
    return this.http.get<Galerie[]>(this.apiUrl);
  }

  getById(id: string): Observable<Galerie> {
    return this.http.get<Galerie>(`${this.apiUrl}/${id}`);
  }

  create(galerie: any): Observable<Galerie> {
    const role = this.authService.getRole() || '';
    const user = this.authService.getUtilisateurConnecte();
    // clubId prioritaire : celui du formulaire (galerie.clubId), sinon celui de l'utilisateur
    let clubId = galerie.clubId !== undefined && galerie.clubId !== null ? galerie.clubId : user?.['clubId'];
    if (!clubId) {
      console.warn('[DEBUG][FRONT] clubId manquant, valeur par défaut 1 utilisée');
      clubId = 1;
    }
    const token = this.authService.getToken();
    const formData = new FormData();
    formData.append('titre', galerie.titre || '');
    formData.append('description', galerie.description || '');
    formData.append('clubId', clubId.toString());
    if (galerie._file) {
      formData.append('image', galerie._file); // le champ doit être 'image'
    }
    // NE PAS forcer le Content-Type, Angular le gère automatiquement pour FormData
    const headers = new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : '',
      'X-User-Role': role.toString(),
      'X-User-ClubId': clubId.toString()
    });
    console.log('[DEBUG][FRONT] clubId envoyé:', clubId);
    return this.http.post<Galerie>(this.apiUrl, formData, { headers })
      .pipe(
        tap({
          next: () => this.imagesUpdated$.next(),
          error: (err: any) => console.error('[DEBUG][FRONT] Erreur backend:', err)
        })
      );
  }

  update(id: string, galerie: Galerie): Observable<Galerie> {
    const role = this.authService.getRole() || '';
    const user = this.authService.getUtilisateurConnecte();
  const clubId = user?.['clubId'] || '';
    const headers = new HttpHeaders({
      'X-User-Role': role.toString(),
      'X-User-ClubId': clubId.toString()
    });
    return this.http.put<Galerie>(`${this.apiUrl}/${id}`, galerie, { headers })
      .pipe(tap(() => this.imagesUpdated$.next()));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`)
      .pipe(tap(() => this.imagesUpdated$.next()));
  }
}