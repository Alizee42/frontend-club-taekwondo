import { Injectable } from '@angular/core';
import {
  CanActivate,
  CanActivateChild,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router
} from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate, CanActivateChild {

  constructor(private router: Router, private authService: AuthService) {}

  canActivate(route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): boolean {
    return this.checkAccess(route);
  }

  canActivateChild(childRoute: ActivatedRouteSnapshot, _state: RouterStateSnapshot): boolean {
    return this.checkAccess(childRoute);
  }

  private checkAccess(route: ActivatedRouteSnapshot): boolean {
    if (!this.authService.isConnecte()) {
      console.warn('🔒 Session invalide ou expirée. Redirection vers /connexion.');
      this.router.navigate(['/connexion']);
      return false;
    }

    const requiredRole = route.data['role'] as string;
    if (requiredRole) {
      const role = this.authService.getRole() ?? '';
      if (role.trim().toUpperCase() !== requiredRole.trim().toUpperCase()) {
        console.warn(`🚫 Accès refusé. Rôle requis : ${requiredRole}, rôle utilisateur : ${role}`);
        this.router.navigate(['/connexion']);
        return false;
      }
    }

    return true;
  }
}
