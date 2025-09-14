// src/app/services/auth.service.ts
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
  
  // Clés de stockage (ne jamais clear tout le localStorage)
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
  /** Observable rôle */
  readonly role$ = this.authState$.pipe(map(s => s.role));
  /** Observable utilisateur courant */
  readonly user$ = this.authState$.pipe(map(s => s.user));
  /** Alias */
  readonly currentUser$ = this.user$;

  constructor(private http: HttpClient) {
    // Au démarrage : recharge depuis le storage + vérifie l’expiration
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

  /** À appeler au bootstrap si besoin (ex: app.component) */
  restoreSession(): void {
    this.hydrateFromStorage();
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

  /** Getter pratique si tu veux `auth.currentUser` en TS */
  get currentUser(): Utilisateur | null {
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

  getAuthHeaders(): HttpHeaders {
    const t = this.getToken();
    return t ? new HttpHeaders({ Authorization: `Bearer ${t}` }) : new HttpHeaders();
  }

  // ========= internes =========

  private storeAuth(res: LoginResponse) {
    // Normalisations & fallbacks
    const normalizedRole = (res.role ?? res.utilisateur?.role ?? '')
      .toString()
      .toUpperCase() as Role | string;

    const utilisateur: Utilisateur = {
      ...(res.utilisateur ?? {}),
      email: res.utilisateur?.email ?? res.email ?? undefined,
      role: normalizedRole,
    };

    // Stockage
    localStorage.setItem(this.K_TOKEN, res.token);
    if (normalizedRole) localStorage.setItem(this.K_ROLE, String(normalizedRole));
    localStorage.setItem(this.K_USER, JSON.stringify(utilisateur));
    if (utilisateur.id != null) {
      localStorage.setItem(this.K_USER_ID, String(utilisateur.id));
    }

    // Réduction d’état + check expiration
    const expired = this.isTokenExpired(res.token);
    this._authState$.next({
      token: expired ? null : res.token,
      role: expired ? null : normalizedRole,
      user: expired ? null : utilisateur,
      isConnecte: !expired
    });

    if (expired) {
      // token déjà expiré (rare, mais sécurisant)
      this.logout();
    }
  }

  private hydrateFromStorage() {
    const token = localStorage.getItem(this.K_TOKEN);
    const roleRaw = localStorage.getItem(this.K_ROLE);
    const role = roleRaw ? roleRaw.toUpperCase() : null;

    let user: Utilisateur | null = null;
    const rawUser = localStorage.getItem(this.K_USER);
    if (rawUser) {
      try {
        user = JSON.parse(rawUser);
      } catch {
        localStorage.removeItem(this.K_USER); 
      }
    }

    if (token && this.isTokenExpired(token)) {
      this.logout();
      return;
    }

    const userWithRole = user ? { ...user, role: user.role ?? role ?? undefined } : null;

    const connected = !!token && !this.isTokenExpired(token);
    this._authState$.next({
      token: token ?? null,
      role,
      user: userWithRole,
      isConnecte: connected
    });
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = this.decodeJwt(token);
      if (!payload || typeof payload.exp !== 'number') return false; // pas d’exp → on considère valide côté client
      const nowSec = Math.floor(Date.now() / 1000);
      return payload.exp < nowSec;
    } catch {
      // token illisible → prudence: invalide
      return true;
    }
  }

  /** Décodage JWT base64url robuste */
  private decodeJwt(token: string): any {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payloadB64 = parts[1];
    const json = this.base64UrlDecode(payloadB64);
    return JSON.parse(json);
  }

  /** base64url → string UTF-8 */
  private base64UrlDecode(str: string): string {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) base64 += '='.repeat(4 - pad);
    const binary = atob(base64);
    try {
      const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
      const decoder = new TextDecoder();
      return decoder.decode(bytes);
    } catch {
      // Fallback (ASCII)
      return binary;
    }
  }
}
