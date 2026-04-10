import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, map, tap, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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
  passwordTemporaire?: boolean;
}

interface AuthState {
  token: string | null;
  role: Role | string | null;
  user: Utilisateur | null;
  isConnecte: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/utilisateurs`;

  private readonly K_TOKEN = 'token';
  private readonly K_ROLE = 'role';
  private readonly K_USER = 'utilisateur';
  private readonly K_USER_LEGACY = 'user';

  private logoutTimer: any = null;

  private readonly _authState$ = new BehaviorSubject<AuthState>({
    token: null,
    role: null,
    user: null,
    isConnecte: false,
  });

  readonly authState$ = this._authState$.asObservable();
  readonly isConnecte$ = this.authState$.pipe(map(s => s.isConnecte));
  readonly role$ = this.authState$.pipe(map(s => s.role));
  readonly user$ = this.authState$.pipe(map(s => s.user));

  constructor(private http: HttpClient) {
    this.hydrateFromStorage();
  }

  // ---- API ----
  login(credentials: { email: string; password: string; clubId?: number }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(res => this.storeAuth(res))
    );
  }

  logout(): void {
    
    // Nettoyer toutes les clés de token pour compatibilité
    localStorage.removeItem(this.K_TOKEN);
    localStorage.removeItem('auth_token');
    localStorage.removeItem(this.K_ROLE);
    localStorage.removeItem(this.K_USER);
    localStorage.removeItem(this.K_USER_LEGACY);
    
    this._authState$.next({ token: null, role: null, user: null, isConnecte: false });

    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
      this.logoutTimer = null;
    }
  }

  restoreSession(): void {
    this.hydrateFromStorage();
  }

  isConnecte(): boolean {
    const s = this._authState$.value;
    const hasToken = !!s.token;
    const isNotExpired = s.token ? !this.isTokenExpired(s.token) : false;
    const isConnected = hasToken && isNotExpired;
    
    
    return isConnected;
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

  updateUtilisateurConnecte(user: Utilisateur | null): void {
    const current = this._authState$.value;
    const resolvedRole = (user?.role ?? current.role ?? '').toString().toUpperCase();

    const nextUser: Utilisateur | null = user
      ? {
          ...(current.user ?? {}),
          ...user,
          ...(resolvedRole ? { role: resolvedRole } : {}),
        }
      : null;

    this.persistUser(nextUser);

    if (resolvedRole) {
      localStorage.setItem(this.K_ROLE, resolvedRole);
    } else {
      localStorage.removeItem(this.K_ROLE);
    }

    this._authState$.next({
      ...current,
      role: resolvedRole || null,
      user: nextUser,
    });
  }

  getAuthHeaders(): HttpHeaders {
    const t = this.getToken();
    return t ? new HttpHeaders({ Authorization: `Bearer ${t}` }) : new HttpHeaders();
  }

  // ---- internes ----
  private storeAuth(res: LoginResponse) {
    const normalizedRole = (res.role ?? res.utilisateur?.role ?? '').toString().toUpperCase();

    const utilisateur: Utilisateur = {
      ...(res.utilisateur ?? {}),
      email: res.utilisateur?.email ?? res.email,
      role: normalizedRole,
    };

    // ✅ Stocker le token sous les deux clés pour compatibilité
    localStorage.setItem(this.K_TOKEN, res.token);
    localStorage.setItem('auth_token', res.token); // Compatibilité avec d'autres composants
    
    if (normalizedRole) localStorage.setItem(this.K_ROLE, normalizedRole);
    this.persistUser(utilisateur);


    const expired = this.isTokenExpired(res.token);

    this._authState$.next({
      token: expired ? null : res.token,
      role: expired ? null : normalizedRole,
      user: expired ? null : utilisateur,
      isConnecte: !expired,
    });

    if (expired) {
      console.warn('[AuthService] Token expiré immédiatement après connexion');
      this.logout();
    } else {
      const payload = this.decodeJwt(res.token);
      if (payload?.exp) {
        this.startAutoLogout(payload.exp);
      }
    }
  }

  private hydrateFromStorage() {
    // Vérifier les deux clés de token pour compatibilité
    const token = localStorage.getItem(this.K_TOKEN) || localStorage.getItem('auth_token');
    const role = localStorage.getItem(this.K_ROLE);
    let user: Utilisateur | null = null;


    try {
      const rawUser = localStorage.getItem(this.K_USER) || localStorage.getItem(this.K_USER_LEGACY);
      if (rawUser) user = JSON.parse(rawUser);
    } catch (e) {
      console.warn('[AuthService] Erreur parsing user data:', e);
      localStorage.removeItem(this.K_USER);
      localStorage.removeItem(this.K_USER_LEGACY);
    }

    // Vérifier si le token est expiré
    let isExpired = false;
    if (token) {
      isExpired = this.isTokenExpired(token);
    }

    if (token && isExpired) {
      console.warn('[AuthService] Token expiré, déconnexion...');
      this.logout();
      return;
    }

    const isConnected = !!token && !isExpired;

    this._authState$.next({
      token,
      role,
      user,
      isConnecte: isConnected,
    });

    if (token && !isExpired) {
      const payload = this.decodeJwt(token);
      if (payload?.exp) {
        this.startAutoLogout(payload.exp);
      }
    }
  }

  private startAutoLogout(expiration: number) {
    const now = Date.now();
    const timeLeft = expiration * 1000 - now;

    if (timeLeft <= 0) {
      this.logout();
      return;
    }

    if (this.logoutTimer) clearTimeout(this.logoutTimer);

    this.logoutTimer = setTimeout(() => {
      console.warn('[AuthService] Session expirée → déconnexion auto');
      this.logout();
    }, timeLeft);
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = this.decodeJwt(token);
      if (!payload?.exp) {
        return false;
      }
      
      const now = Math.floor(Date.now() / 1000);
      const isExpired = payload.exp < now;
      
      return isExpired;
    } catch (e) {
      console.error('[AuthService] Erreur décodage token:', e);
      return true;
    }
  }

  private decodeJwt(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.error('[AuthService] Token JWT invalide - nombre de parties:', parts.length);
        return null;
      }
      
      let payload = parts[1];
      // Ajouter padding si nécessaire
      while (payload.length % 4) {
        payload += '=';
      }
      
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch (e) {
      console.error('[AuthService] Erreur décodage JWT:', e);
      return null;
    }
  }

  getUserIdFromToken(): number | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const payload = this.decodeJwt(token);
      return payload?.utilisateurId ?? null;
    } catch (e) {
      console.error('[AuthService] Erreur décodage JWT', e);
      return null;
    }
  }

  getMembreIdFromToken(): number | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const payload = this.decodeJwt(token);
      return payload?.membreId ?? null;
    } catch (e) {
      console.error('[AuthService] Erreur décodage JWT', e);
      return null;
    }
  }

  private persistUser(user: Utilisateur | null): void {
    if (!user) {
      localStorage.removeItem(this.K_USER);
      localStorage.removeItem(this.K_USER_LEGACY);
      return;
    }

    const serialized = JSON.stringify(user);
    localStorage.setItem(this.K_USER, serialized);
    localStorage.setItem(this.K_USER_LEGACY, serialized);
  }
}
