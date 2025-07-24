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
    const roles = JSON.parse(localStorage.getItem('roles') || '[]'); // Récupération des rôles sous forme de tableau

    // Vérification de la présence du token
    if (!token || token.trim() === '') {
      console.warn('Token invalide ou non trouvé. Redirection vers la page de connexion.');
      this.router.navigate(['/connexion']);
      return false;
    }

    // Récupération des rôles requis pour la route
    const requiredRoles = route.data['roles'] as string[]; // Rôles requis pour accéder à la route

    // Vérification des rôles
    if (requiredRoles && !requiredRoles.some(role => roles.includes(role))) {
      console.warn('Accès refusé : rôle non autorisé. Redirection vers la page de connexion.');
      this.router.navigate(['/connexion']);
      return false;
    }

    // Si toutes les vérifications passent, l'accès est autorisé
    return true;
  }
}