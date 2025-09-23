// src/app/services/actualite.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Actualite {
  id?: string;
  titre: string;
  contenu: string;
  datePublication?: string;
  approuve?: boolean;
  photo?: string;
  featured?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ActualiteService {
  private readonly apiUrl = `${environment.apiUrl}/actualites`;
  private readonly actualitesSubject = new BehaviorSubject<Actualite[]>([]);

  constructor(private http: HttpClient) {
    this.reloadActualites(); // charge les actus au démarrage
  }

  /** 🔹 Observable public pour récupérer les actualités */
  getAll(): Observable<Actualite[]> {
    return this.actualitesSubject.asObservable();
  }

  /** 🔹 Recharge les actualités depuis l'API */
  reloadActualites(): void {
    this.http.get<Actualite[]>(this.apiUrl).pipe(
      tap(data => this.actualitesSubject.next(data)),
      catchError(this.handleError('rechargement'))
    ).subscribe();
  }

  /** 🔹 Crée une nouvelle actualité */
  create(actualite: Actualite): Observable<Actualite> {
    return this.http.post<Actualite>(this.apiUrl, actualite).pipe(
      tap(() => this.reloadActualites()),
      catchError(this.handleError('création'))
    );
  }

  /** 🔹 Met à jour une actualité */
  update(id: string, actualite: Actualite): Observable<Actualite> {
    return this.http.put<Actualite>(`${this.apiUrl}/${id}`, actualite).pipe(
      tap(() => this.reloadActualites()),
      catchError(this.handleError('mise à jour'))
    );
  }

  /** 🔹 Supprime une actualité */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.reloadActualites()),
      catchError(this.handleError('suppression'))
    );
  }

  /** 🔹 Récupère une actualité par ID */
  getById(id: string): Observable<Actualite> {
    return this.http.get<Actualite>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError('récupération'))
    );
  }

  /** 🔹 Définit une actualité comme "À la une" */
  setFeatured(actu: Actualite): Observable<Actualite> {
    return this.http.put<Actualite>(`${this.apiUrl}/${actu.id}/featured`, actu).pipe(
      tap(() => this.reloadActualites()),
      catchError(this.handleError('mise à la une'))
    );
  }

  /** 🔹 Récupère les actualités à la une */
  getFeatured(): Observable<Actualite[]> {
    return this.http.get<Actualite[]>(`${this.apiUrl}/featured`).pipe(
      catchError(this.handleError('récupération des actus à la une'))
    );
  }

  /** 🔹 Gestion centralisée des erreurs */
  private handleError(operation: string) {
    return (error: any) => {
      console.error(`❌ Erreur lors de ${operation} des actualités :`, error);
      return throwError(() => error);
    };
  }
}
