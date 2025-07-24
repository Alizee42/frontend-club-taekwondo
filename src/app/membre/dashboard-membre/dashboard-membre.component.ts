import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common'; // Importer CommonModule pour NgIf

// Interface pour représenter un utilisateur
interface Utilisateur {
  id: number;
  nom: string;
  prenom: string;
  email: string;
}

@Component({
  selector: 'app-dashboard-membre',
  standalone: true, // Indique que le composant est standalone
  templateUrl: './dashboard-membre.component.html',
  styleUrls: ['./dashboard-membre.component.css'],
  imports: [CommonModule] // Ajoutez CommonModule ici
})
export class DashboardMembreComponent implements OnInit {
  utilisateurConnecte: Utilisateur | null = null; // Stocke les informations de l'utilisateur connecté

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.loadUtilisateurConnecte();

    // Vérification des rôles
    const roles = JSON.parse(localStorage.getItem('roles') || '[]');
    if (!roles.includes('MEMBRE')) {
      alert('Accès refusé. Vous n\'êtes pas autorisé à accéder à cette section.');
      this.router.navigate(['/connexion']);
    }
  }

  // Charger l'utilisateur connecté
  loadUtilisateurConnecte() {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Utilisateur non connecté.');
      this.router.navigate(['/connexion']); // Redirige vers la page de connexion si aucun token
      return;
    }

    this.http.get<Utilisateur>('http://localhost:8080/api/utilisateurs/me', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (utilisateur) => {
        this.utilisateurConnecte = utilisateur;
        localStorage.setItem('utilisateurId', utilisateur.id.toString());
      },
      error: (err) => {
        console.error('Erreur lors de la récupération de l\'utilisateur connecté :', err);
        alert('Impossible de récupérer les informations de l\'utilisateur connecté.');
        this.router.navigate(['/connexion']); // Redirige vers la page de connexion en cas d'erreur
      }
    });
  }

  navigateToDocuments() {
    this.router.navigate(['/membre/documents']); // Redirige vers la section Documents
  }

  navigateToPaiements() {
    this.router.navigate(['/membre/paiements']); // Redirige vers la section Paiements
  }

  navigateToStore() {
    this.router.navigate(['/membre/store']); // Redirige vers la section Store
  }

  navigateToSuivi() {
    this.router.navigate(['/membre/suivi']); // Redirige vers la section Suivi personnel
  }
}