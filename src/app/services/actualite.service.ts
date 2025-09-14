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
        console.error('❌ Erreur lors du rechargement des actualités :', error);
        return throwError(() => error);
      })
    ).subscribe();
  }

  /** 🔹 Crée une nouvelle actualité */
  create(actualite: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, actualite).pipe(
      tap(() => {
        this.reloadActualites();
      }),
      catchError(error => {
        console.error('❌ Erreur lors de la création de l\'actualité :', error);
        return throwError(() => error);
      })
    );
  }

  /** 🔹 Met à jour une actualité */
  update(id: string, actualite: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, actualite).pipe(
      tap(() => {
        this.reloadActualites();
      }),
      catchError(error => {
        console.error('❌ Erreur lors de la mise à jour de l\'actualité :', error);
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
        console.error('❌ Erreur lors de la suppression de l\'actualité :', error);
        return throwError(() => error);
      })
    );
  }

  /** 🔹 Récupère une actualité par ID */
  getById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      tap(data => console.log('✅ Actualité récupérée :', data)),
      catchError(error => {
        console.error('❌ Erreur lors de la récupération de l\'actualité :', error);
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
        console.error('❌ Erreur lors de la mise à la une :', error);
        return throwError(() => error);
      })
    );
  }

  /** 🔹 Récupère les actualités à la une */
  getFeatured(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/featured`).pipe(
      tap(data => console.log('✅ Actualités à la une récupérées :', data)),
      catchError(error => {
        console.error('❌ Erreur lors de la récupération des actualités à la une :', error);
        return throwError(() => error);
      })
    );
  }
}