import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ActualiteService {
  private apiUrl = 'http://localhost:8080/api/actualites'; // URL du backend
  private actualitesSubject = new BehaviorSubject<any[]>([]); // Comportement dynamique des actualités

  constructor(private http: HttpClient) {
    // Charger les actualités au démarrage du service
    this.loadActualites();
  }

  // Récupérer les actualités
  getAll(): Observable<any[]> {
    return this.actualitesSubject.asObservable();
  }

  // Charger toutes les actualités depuis l'API
  private loadActualites(): void {
    this.http.get<any[]>(this.apiUrl).pipe(
      catchError((error) => {
        console.error('Erreur lors du chargement des actualités:', error);
        throw error; // Gérer l'erreur si nécessaire (notifier l'utilisateur par exemple)
      })
    ).subscribe((data) => {
      this.actualitesSubject.next(data); // Met à jour la liste des actualités dans le Subject
    });
  }

  // Ajouter un mécanisme pour recharger les actualités manuellement
  reloadActualites(): void {
    this.loadActualites(); // Recharge les actualités
  }

  // Créer une nouvelle actualité
  create(actualite: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, actualite).pipe(
      catchError((error) => {
        console.error('Erreur lors de la création de l\'actualité:', error);
        throw error;
      }),
      tap(() => this.reloadActualites()) // Recharge les actualités après la création
    );
  }

  // Mettre à jour une actualité existante
  update(id: string, actualite: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, actualite).pipe(
      catchError((error) => {
        console.error('Erreur lors de la mise à jour de l\'actualité:', error);
        throw error;
      }),
      tap(() => this.reloadActualites()) // Recharge les actualités après la mise à jour
    );
  }

  // Supprimer une actualité
  delete(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.error('Erreur lors de la suppression de l\'actualité:', error);
        throw error;
      }),
      tap(() => {
        // Optionnel : filtrer l'actualité supprimée du cache local
        const currentActualites = this.actualitesSubject.getValue();
        this.actualitesSubject.next(currentActualites.filter(actualite => actualite.id !== id));
      })
    );
  }
}
