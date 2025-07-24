import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface Utilisateur {
  id: number;
  nom: string;
  email?: string;
  role?: string; // Rôle unique en String
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8080/api/utilisateurs';

  constructor(private http: HttpClient) {}

  // Inscription
  register(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  // Connexion
  login(credentials: { email: string; password: string }): Observable<any> {
    return new Observable((observer) => {
      this.http.post(`${this.apiUrl}/login`, credentials).subscribe({
        next: (response: any) => {
          console.log('✅ Réponse du backend :', response);

          // Nettoyage
          localStorage.clear();

          // Stockage
          if (response.token) {
            localStorage.setItem('token', response.token);
          }

          if (response.role) {
            localStorage.setItem('role', response.role); // Rôle unique
          }

          if (response.utilisateur) {
            localStorage.setItem('utilisateur', JSON.stringify(response.utilisateur));
          }

          observer.next(response);
          observer.complete();
        },
        error: (err) => {
          console.error('❌ Erreur de connexion :', err);
          observer.error(err);
        }
      });
    });
  }

  // Déconnexion
  logout(): void {
    localStorage.clear();
  }

  // Vérifie si connecté
  isConnecte(): boolean {
    return !!localStorage.getItem('token');
  }

  // Récupère l'utilisateur connecté
  getUtilisateurConnecte(): Utilisateur | null {
    const user = localStorage.getItem('utilisateur');
    return user ? JSON.parse(user) : null;
  }

  // Récupère le token
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // Récupère le rôle
  getRole(): string | null {
    return localStorage.getItem('role');
  }

  // Vérifie si le rôle est égal
  hasRole(role: string): boolean {
    return this.getRole() === role;
  }

  isAdmin(): boolean {
    return this.hasRole('ADMIN');
  }

  isMembre(): boolean {
    return this.hasRole('MEMBRE');
  }

  isParent(): boolean {
    return this.hasRole('PARENT');
  }
}
