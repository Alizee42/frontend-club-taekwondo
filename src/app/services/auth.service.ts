import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface Utilisateur {
  id: number;
  nom: string;
  prenom?: string;
  email?: string;
  role?: string; // Rôle unique (ex : "MEMBRE", "PARENT", "ADMIN")
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8080/api/utilisateurs';

  constructor(private http: HttpClient) {}

  // 👉 Inscription
  register(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  // 👉 Connexion
  login(credentials: { email: string; password: string }): Observable<any> {
    return new Observable((observer) => {
      this.http.post(`${this.apiUrl}/login`, credentials).subscribe({
        next: (response: any) => {
          console.log('✅ Réponse du backend :', response);

          // 🔐 Nettoyage de l'ancien stockage
          localStorage.clear();

          // ✅ Stockage du token
          if (response.token) {
            localStorage.setItem('token', response.token);
          }

          // ✅ Stockage du rôle
          if (response.role) {
            localStorage.setItem('role', response.role);
          }

          // ✅ Stockage de l'utilisateur complet
          if (response.utilisateur) {
            localStorage.setItem('utilisateur', JSON.stringify(response.utilisateur));
            if (response.utilisateur.id) {
              localStorage.setItem('utilisateurId', response.utilisateur.id.toString());
            }
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

  // 👉 Déconnexion
  logout(): void {
    localStorage.clear();
  }

  // 👉 Vérifie si un token est présent
  isConnecte(): boolean {
    return !!localStorage.getItem('token');
  }

  // 👉 Récupère le token JWT
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // 👉 Récupère l'utilisateur connecté
  getUtilisateurConnecte(): Utilisateur | null {
    const user = localStorage.getItem('utilisateur');
    return user ? JSON.parse(user) : null;
  }

  // 👉 Récupère l'id utilisateur
  getUtilisateurId(): number | null {
    const id = localStorage.getItem('utilisateurId');
    return id ? parseInt(id, 10) : null;
  }

  // 👉 Récupère le rôle
  getRole(): string | null {
    return localStorage.getItem('role');
  }

  // 👉 Vérifie un rôle
  hasRole(role: string): boolean {
    return this.getRole() === role;
  }

  // 👉 Rôles spécifiques
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
