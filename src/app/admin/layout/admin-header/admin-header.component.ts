import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-header',
  templateUrl: './admin-header.component.html',
  styleUrls: ['./admin-header.component.css']
})
export class AdminHeaderComponent {
  constructor(private router: Router) {}

  goToHome() {
    this.router.navigate(['/']); // Redirige vers la page d'accueil principale
  }
  goToProfil() {
    this.router.navigate(['/profil']); // Redirige vers la page "Modifier mon profil"
  }
  logout() {
    localStorage.removeItem('token'); // Supprime le token pour déconnexion
    this.router.navigate(['/connexion']); // Redirige vers la page de connexion
  }
}