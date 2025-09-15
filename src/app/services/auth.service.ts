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

  // ✅ on garde une seule clé cohérente : "token"
  private readonly K_TOKEN = 'token';
  private readonly K_ROLE = 'role';
  private readonly K_USER = 'utilisateur';

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

  login(credentials: { email: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(res => this.storeAuth(res))
    );
  }

  logout(): void {
    localStorage.removeItem(this.K_TOKEN);
    localStorage.removeItem(this.K_ROLE);
    localStorage.removeItem(this.K_USER);
    this._authState$.next({ token: null, role: null, user: null, isConnecte: false });
  }

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

    // ✅ stockage unique dans "token"
    localStorage.setItem(this.K_TOKEN, res.token);
    if (normalizedRole) localStorage.setItem(this.K_ROLE, normalizedRole);
    localStorage.setItem(this.K_USER, JSON.stringify(utilisateur));

    const expired = this.isTokenExpired(res.token);

    this._authState$.next({
      token: expired ? null : res.token,
      role: expired ? null : normalizedRole,
      user: expired ? null : utilisateur,
      isConnecte: !expired,
    });

    if (expired) this.logout();
  }

  private hydrateFromStorage() {
    const token = localStorage.getItem(this.K_TOKEN);
    const role = localStorage.getItem(this.K_ROLE);
    let user: Utilisateur | null = null;

    try {
      const rawUser = localStorage.getItem(this.K_USER);
      if (rawUser) user = JSON.parse(rawUser);
    } catch {
      localStorage.removeItem(this.K_USER);
    }

    if (token && this.isTokenExpired(token)) {
      this.logout();
      return;
    }

    this._authState$.next({
      token,
      role,
      user,
      isConnecte: !!token && !this.isTokenExpired(token),
    });
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = this.decodeJwt(token);
      if (!payload?.exp) return false;
      return payload.exp < Math.floor(Date.now() / 1000);
    } catch {
      return true;
    }
  }

  private decodeJwt(token: string): any {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(payload);
  }
}
