// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

type Role = 'ADMIN' | 'PARENT' | 'MEMBRE';

export interface Utilisateur {
  id: number;
  nom: string;
  prenom?: string;
  email?: string;
  role?: Role | string;
  [key: string]: any;
}

interface LoginResponse {
  token: string;
  role: Role | string;
  email: string;
  utilisateur: Utilisateur;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  // si tu as un environment.apiUrl, mets-le ici, sinon garde '/api'
  private readonly apiUrl = '/api/utilisateurs';

  // clés de stockage locales (évite localStorage.clear())
  private readonly K_TOKEN = 'token';
  private readonly K_ROLE = 'role';
  private readonly K_USER = 'utilisateur';
  private readonly K_USER_ID = 'utilisateurId';

  constructor(private http: HttpClient) {}

  // 👉 Inscription
  register(data: Partial<Utilisateur> & { password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  // 👉 Connexion (stocke token/role/user)
  login(credentials: { email: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(res => this.storeAuth(res))
    );
  }

  // 👉 Déconnexion
  logout(): void {
    localStorage.removeItem(this.K_TOKEN);
    localStorage.removeItem(this.K_ROLE);
    localStorage.removeItem(this.K_USER);
    localStorage.removeItem(this.K_USER_ID);
  }

  // 👉 Helpers de lecture
  isConnecte(): boolean {
    return !!localStorage.getItem(this.K_TOKEN);
  }

  getToken(): string | null {
    return localStorage.getItem(this.K_TOKEN);
  }

  getRole(): Role | string | null {
    return localStorage.getItem(this.K_ROLE);
  }

  getUtilisateurConnecte(): Utilisateur | null {
    const raw = localStorage.getItem(this.K_USER);
    return raw ? JSON.parse(raw) as Utilisateur : null;
  }

  getUtilisateurId(): number | null {
    const id = localStorage.getItem(this.K_USER_ID);
    return id ? parseInt(id, 10) : null;
  }

  // 👉 Vérifs de rôle
  hasRole(role: Role | string): boolean {
    return (this.getRole() || '').toUpperCase() === String(role).toUpperCase();
  }
  isAdmin(): boolean { return this.hasRole('ADMIN'); }
  isMembre(): boolean { return this.hasRole('MEMBRE'); }
  isParent(): boolean { return this.hasRole('PARENT'); }

  // ====== internes ======
  private storeAuth(res: LoginResponse) {
    // Ne pas clear tout le localStorage, juste nos clés
    localStorage.setItem(this.K_TOKEN, res.token);
    if (res.role) localStorage.setItem(this.K_ROLE, String(res.role));
    if (res.utilisateur) {
      localStorage.setItem(this.K_USER, JSON.stringify(res.utilisateur));
      if (res.utilisateur.id) {
        localStorage.setItem(this.K_USER_ID, String(res.utilisateur.id));
      }
    }
  }
}
