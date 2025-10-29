import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Membre {
  id: number;
  nom: string;
  prenom: string;
}

@Injectable({ providedIn: 'root' })
export class MembreService {
  private readonly apiUrl = `${environment.apiUrl}/membres`;

  constructor(private http: HttpClient) {}

  /** Ajout d'un membre à un club (super-admin) */
  addMembreToClub(clubId: number, membre: Partial<Membre>) {
    return this.http.post<Membre>(`${this.apiUrl}?clubId=${clubId}`, membre);
  }

  /** Modification d'un membre (super-admin) */
  updateMembre(membre: Partial<Membre>) {
    if (!membre.id) throw new Error('ID membre requis');
    return this.http.put<Membre>(`${this.apiUrl}/${membre.id}`, membre);
  }

  /** Suppression d'un membre (super-admin) */
  deleteMembre(membreId: number) {
    return this.http.delete(`${this.apiUrl}/${membreId}`);
  }

  /** 🔎 Debug utilitaire */
  private log(prefix: string, data?: any) {
    if (data) {
  // ...log supprimé...
    } else {
  // ...log supprimé...
    }
  }

  /** Enfants du parent connecté */
  getMembresPourParentConnecte(): Observable<Membre[] | null> {
    this.log('Appel → GET /mes-enfants');
  // ...log supprimé...
  // ...log supprimé...
    
    return this.http.get<Membre[]>(`${this.apiUrl}/mes-enfants`).pipe(
      catchError(err => {
        // this.log('Erreur GET /mes-enfants', err);
        console.error('[DEBUG] Détails erreur:', {
          status: err.status,
          statusText: err.statusText,
          url: err.url,
          message: err.message,
          error: err.error
        });
        if (err.status === 400 || err.status === 401) return of(null);
        return of(null);
      })
    );
  }

  /** Endpoint de debug pour tester la récupération des enfants */
  debugParentEnfants(): Observable<any> {
    this.log('Appel → GET /debug/parent-enfants');
    return this.http.get<any>(`${this.apiUrl}/debug/parent-enfants`).pipe(
      catchError(err => {
        // this.log('Erreur GET /debug/parent-enfants', err);
        return of({ error: err });
      })
    );
  }

  /** Membre lié à l’utilisateur connecté */
  getMembreConnecte(): Observable<Membre | null> {
    this.log('Appel → GET /me');
    return this.http.get<Membre>(`${this.apiUrl}/me`).pipe(
      catchError(err => {
        // this.log('Erreur GET /me', err);
        if (err.status === 400 || err.status === 401) return of(null);
        return of(null);
      })
    );
  }

  /** Liste des membres liés à un utilisateur donné */
  getMembresParUtilisateur(utilisateurId: number): Observable<Membre[] | null> {
    this.log(`Appel → GET ?utilisateurId=${utilisateurId}`);
    return this.http.get<Membre[]>(`${this.apiUrl}?utilisateurId=${utilisateurId}`).pipe(
      catchError(err => {
        // this.log(`Erreur GET ?utilisateurId=${utilisateurId}`, err);
        if (err.status === 400 || err.status === 401) return of(null);
        return of(null);
      })
    );
  }

    /** Liste des membres filtrés par club */
    getMembresParClub(clubId: string | number): Observable<Membre[] | null> {
      // this.log(`Appel → GET ?clubId=${clubId}`);
      return this.http.get<Membre[]>(`${this.apiUrl}?clubId=${clubId}`).pipe(
        catchError(err => {
          // this.log(`Erreur GET ?clubId=${clubId}`, err);
          if (err.status === 400 || err.status === 401) return of(null);
          return of(null);
        })
      );
    }
}
