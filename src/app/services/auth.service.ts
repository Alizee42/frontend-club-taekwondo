import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface Utilisateur {
  id: number;
  nom: string;
  email?: string;
  roles?: string[]; // Mise à jour pour gérer plusieurs rôles
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8080/api/utilisateurs'; // Backend

  constructor(private http: HttpClient) {}

  // Méthode pour l'inscription
  register(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  // Méthode pour la connexion
  login(credentials: { email: string; password: string }): Observable<any> {
    return new Observable((observer) => {
      this.http.post(`${this.apiUrl}/login`, credentials).subscribe({
        next: (response: any) => {
          console.log('✅ Réponse du backend :', response);

          // Nettoyer le localStorage avant de stocker les nouvelles données
          localStorage.clear();

          // Enregistrer les nouvelles données
          if (response.token) {
            localStorage.setItem('token', response.token);
          }

          if (response.roles) {
            localStorage.setItem('roles', JSON.stringify(response.roles)); // Stocker les rôles sous forme de tableau
          }

          if (response.utilisateur) {
            localStorage.setItem('utilisateur', JSON.stringify(response.utilisateur));
          }

          observer.next(response); // Retourner la réponse au composant appelant
          observer.complete();
        },
        error: (err) => {
          console.error('❌ Erreur de connexion :', err);
          observer.error(err); // Retourner l'erreur au composant appelant
        }
      });
    });
  }

  // Méthode pour la déconnexion
  logout(): void {
    localStorage.clear();
  }

  // Vérifier si l'utilisateur est connecté
  isConnecte(): boolean {
    return !!localStorage.getItem('token'); // Vérifie si un token est présent
  }

  // Récupérer l'utilisateur connecté
  getUtilisateurConnecte(): Utilisateur | null {
    const user = localStorage.getItem('utilisateur');
    return user ? JSON.parse(user) : null;
  }

  // Récupérer le token
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // Récupérer les rôles de l'utilisateur
  getRoles(): string[] {
    const roles = localStorage.getItem('roles');
    return roles ? JSON.parse(roles) : [];
  }

  // Vérifier si l'utilisateur a un rôle spécifique
  hasRole(role: string): boolean {
    const roles = this.getRoles();
    return roles.includes(role);
  }
}