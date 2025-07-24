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

    if (!token || token.trim() === '') {
      console.warn('🔒 Token manquant. Redirection vers /connexion.');
      this.router.navigate(['/connexion']);
      return false;
    }

    const requiredRole = route.data['role'] as string;

    if (requiredRole && role.trim().toUpperCase() !== requiredRole.trim().toUpperCase()) {
      console.warn(`🚫 Accès refusé. Rôle requis : ${requiredRole}, rôle utilisateur : ${role}`);
      this.router.navigate(['/connexion']);
      return false;
    }

    return true;
  }
}
