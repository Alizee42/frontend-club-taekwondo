import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private router: Router) {}

    canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role')?.toLowerCase();
  
    if (!token) {
      console.warn('Token non trouvé. Redirection vers la page de connexion.');
      this.router.navigate(['/connexion']);
      return false;
    }
  
    if (role === 'admin' || role === 'membre') {
      return true;
    } else {
      console.warn('Rôle non autorisé ou non défini. Redirection vers la page de connexion.');
      this.router.navigate(['/connexion']);
      return false;
    }
  }
}