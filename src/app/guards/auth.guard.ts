import { Injectable } from '@angular/core';
import {
  CanActivate,
  CanActivateChild,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router
} from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate, CanActivateChild {

  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    return this.checkAccess(route);
  }

  canActivateChild(childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    return this.checkAccess(childRoute);
  }

  private checkAccess(route: ActivatedRouteSnapshot): boolean {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role') || '';
console.log('Token récupéré :', token);
console.log('Rôle récupéré :', role);

    if (!token || token.trim() === '') {
      console.warn('🔒 Token manquant. Redirection vers /connexion.');
      this.router.navigate(['/connexion']);
      return false;
    }

    // Vérifie expiration
    if (this.isTokenExpired(token)) {
      console.warn('⏰ Token expiré. Redirection vers /connexion.');
      this.router.navigate(['/connexion']);
      return false;
    }

    // Vérifie rôle
    const requiredRole = route.data['role'] as string;
    if (requiredRole && role.trim().toUpperCase() !== requiredRole.trim().toUpperCase()) {
      console.warn(`🚫 Accès refusé. Rôle requis : ${requiredRole}, rôle utilisateur : ${role}`);
      this.router.navigate(['/connexion']);
      return false;
    }

    return true;
  }

  /** Vérifie si un JWT est expiré */
  private isTokenExpired(token: string): boolean {
    try {
      const payload = this.decodeJwt(token);
      if (!payload?.exp) return false; // pas de date d’exp → on considère valide
      const now = Math.floor(Date.now() / 1000);
      return payload.exp < now;
    } catch (e) {
      console.error('Erreur lors du décodage du JWT:', e);
      return true; // si invalide → on refuse
    }
  }

  /** Décodage base64url simple */
  private decodeJwt(token: string): any {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(payload);
    return JSON.parse(decoded);
  }
}
