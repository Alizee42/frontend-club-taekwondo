import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {

    // Vérifie si le token d'authentification est présent dans le localStorage
    const token = localStorage.getItem('token');
    if (token) {
      // Si le token existe, l'utilisateur peut accéder à la route
      return true;
    } else {
      // Si le token n'existe pas, redirige vers la page de connexion
      this.router.navigate(['/connexion']);
      return false;
    }
  }
}
