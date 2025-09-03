// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, map, tap } from 'rxjs';
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

interface AuthState {
  token: string | null;
  role: Role | string | null;
  user: Utilisateur | null;
  isConnecte: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = '/api/utilisateurs';

  // clés de stockage (ne jamais clear tout le localStorage)
  private readonly K_TOKEN = 'token';
  private readonly K_ROLE = 'role';
  private readonly K_USER = 'utilisateur';
  private readonly K_USER_ID = 'utilisateurId';

  // ---- état réactif
  private readonly _authState$ = new BehaviorSubject<AuthState>({
    token: null,
    role: null,
    user: null,
    isConnecte: false,
  });

  /** Observable complet (token, user, role, isConnecte) */
  readonly authState$ = this._authState$.asObservable();
  /** Observable booléen utile pour le header / guards */
  readonly isConnecte$ = this.authState$.pipe(map(s => s.isConnecte));
  /** Observable rôle (facile pour *ngIf role === 'ADMIN'*) */
  readonly role$ = this.authState$.pipe(map(s => s.role));
  /** Observable utilisateur courant */
  readonly user$ = this.authState$.pipe(map(s => s.user));

  constructor(private http: HttpClient) {
    // au démarrage : recharge depuis le storage + vérifie l’expiration
    this.hydrateFromStorage();
  }

  // ========= API publique =========

  register(data: Partial<Utilisateur> & { password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  login(credentials: { email: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(res => this.storeAuth(res))
    );
  }

  logout(): void {
    localStorage.removeItem(this.K_TOKEN);
    localStorage.removeItem(this.K_ROLE);
    localStorage.removeItem(this.K_USER);
    localStorage.removeItem(this.K_USER_ID);
    this._authState$.next({ token: null, role: null, user: null, isConnecte: false });
  }

  isConnecte(): boolean {
    const s = this._authState$.value;
    return !!s.token && !this.isTokenExpired(s.token);
  }

  getToken(): string | null {
    return this._authState$.value.token;
  }

  getRole(): Role | string | null {
    return this._authState$.value.role;
  }

  getUtilisateurConnecte(): Utilisateur | null {
    return this._authState$.value.user;
  }

  getUtilisateurId(): number | null {
    return this._authState$.value.user?.id ?? null;
  }

  hasRole(role: Role | string): boolean {
    return (this.getRole() || '').toUpperCase() === String(role).toUpperCase();
  }
  isAdmin(): boolean { return this.hasRole('ADMIN'); }
  isMembre(): boolean { return this.hasRole('MEMBRE'); }
  isParent(): boolean { return this.hasRole('PARENT'); }

  /** Headers avec Bearer pour tes requêtes protégées */
  getAuthHeaders(): HttpHeaders {
    const t = this.getToken();
    return t ? new HttpHeaders({ Authorization: `Bearer ${t}` }) : new HttpHeaders();
  }

  // ========= internes =========

  private storeAuth(res: LoginResponse) {
    // Stockage
    localStorage.setItem(this.K_TOKEN, res.token);
    if (res.role) localStorage.setItem(this.K_ROLE, String(res.role));
    if (res.utilisateur) {
      localStorage.setItem(this.K_USER, JSON.stringify(res.utilisateur));
      if (res.utilisateur.id != null) {
        localStorage.setItem(this.K_USER_ID, String(res.utilisateur.id));
      }
    }

    // Réduction d’état + check expiration
    const expired = this.isTokenExpired(res.token);
    this._authState$.next({
      token: expired ? null : res.token,
      role: expired ? null : (res.role ?? null),
      user: expired ? null : (res.utilisateur ?? null),
      isConnecte: !expired
    });

    if (expired) {
      // token déjà expiré (rare, mais sécurisant)
      this.logout();
    }
  }

  private hydrateFromStorage() {
    const token = localStorage.getItem(this.K_TOKEN);
    const role = localStorage.getItem(this.K_ROLE);
    const rawUser = localStorage.getItem(this.K_USER);
    const user: Utilisateur | null = rawUser ? JSON.parse(rawUser) : null;

    // Si token expiré → purge immédiate
    if (token && this.isTokenExpired(token)) {
      this.logout();
      return;
    }

    this._authState$.next({
      token,
      role,
      user,
      isConnecte: !!token
    });
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = this.decodeJwt(token);
      if (!payload || !payload.exp) return false; // pas d’exp → on considère valide côté client
      const nowSec = Math.floor(Date.now() / 1000);
      return payload.exp < nowSec;
    } catch {
      // token illisible → prudence: on le considère invalide
      return true;
    }
  }

  /** Décodage simple (non vérifié cryptographiquement) */
  private decodeJwt(token: string): any {
    const [, payload] = token.split('.');
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(json)));
  }
}
