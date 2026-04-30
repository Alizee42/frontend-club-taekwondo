
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class ActualiteService {
  private apiUrl = `${environment.apiUrl}/actualites`;
  private actualitesSubject = new BehaviorSubject<any[]>([]);

  constructor(private http: HttpClient) {
    this.reloadActualites(); // Initialisation des actualités
  }

  /** 🔹 Observable public pour récupérer les actualités */
  getAll(): Observable<any[]> {
    return this.actualitesSubject.asObservable();
  }

  /** 🔹 Recharge manuellement les actualités depuis l'API */
  reloadActualites(): void {
    this.http.get<any[]>(this.apiUrl).pipe(
      tap(data => {
        this.actualitesSubject.next(data);
      }),
      catchError(error => {
        return throwError(() => error);
      })
    ).subscribe();
  }

  /** 🔹 Crée une nouvelle actualité */
  create(actualite: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, this.toApiPayload(actualite)).pipe(
      tap(() => {
        this.reloadActualites();
      }),
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  /** 🔹 Met à jour une actualité */
  update(id: string, actualite: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, this.toApiPayload(actualite)).pipe(
      tap(() => {
        this.reloadActualites();
      }),
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  /** 🔹 Supprime une actualité */
  delete(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        this.reloadActualites();
      }),
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  /** 🔹 Récupère une actualité par ID */
  getById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
  tap(data => {}),
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  /** 🔹 Définit une actualité comme "À la une" */
  setFeatured(actu: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${actu.id}/featured`, actu).pipe(
      tap(() => {
        this.reloadActualites();
      }),
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  /** 🔹 Récupère les actualités à la une */
  getFeatured(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/featured`).pipe(
  tap(data => {}),
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  /** 🔹 Récupère les actualités d'un club */
  getActualitesByClub(clubId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/club/${clubId}`).pipe(
      tap(data => this.actualitesSubject.next(data)),
      catchError(error => {
        return throwError(() => error);
      })
    );
  }
    // ...imports et code existant...
  /** 🔹 Crée une actualité avec image (multipart) */
  createMultipart(formData: FormData): Observable<any> {
    return this.http.post<any>(this.apiUrl + '/with-image', formData).pipe(
      tap(() => {
        this.reloadActualites();
      }),
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  /** 🔹 Met à jour une actualité avec image (multipart) */
  updateMultipart(id: string, formData: FormData): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}/with-image`, formData).pipe(
      tap(() => {
        this.reloadActualites();
      }),
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  private toApiPayload(actualite: any): any {
    const payload = { ...actualite };

    if (payload.clubId !== undefined && payload.clubId !== null) {
      payload.clubId = String(payload.clubId);
    }

    if (payload.datePublication) {
      payload.datePublication = this.toLocalDateTime(payload.datePublication);
    }

    return payload;
  }

  private toLocalDateTime(value: string | Date): string {
    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    const pad = (part: number) => String(part).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }
}
