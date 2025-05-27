import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header-membre',
  templateUrl: './membre-header.component.html',
  styleUrls: ['./membre-header.component.css'],
  standalone: true // Déclare le composant comme autonome
})
export class MembreHeaderComponent {
  constructor(private router: Router) {}

  goToHome() {
    this.router.navigate(['/']); // Redirige vers la page d'accueil principale
  }
  goToProfil() {
    this.router.navigate(['/profil']); // Redirige vers la page "Modifier mon profil"
  }
  goToDashboard() {
    const role = localStorage.getItem('role'); // Récupère le rôle de l'utilisateur depuis le localStorage
    if (role === 'membre') {
      this.router.navigate(['/membre/dashboard-membre']); // Redirige vers le tableau de bord membre
    } else if (role === 'admin') {
      this.router.navigate(['/admin/dashboard-admin']); // Redirige vers le tableau de bord admin
    } else {
      alert('Rôle inconnu. Veuillez contacter l\'administrateur.');
      this.router.navigate(['/connexion']); // Redirige vers la page de connexion en cas de rôle inconnu
    }
  }
  logout() {
    localStorage.removeItem('token'); // Supprime le token pour déconnexion
    localStorage.removeItem('role'); // Supprime le rôle pour déconnexion
    this.router.navigate(['/connexion']); // Redirige vers la page de connexion
  }
}