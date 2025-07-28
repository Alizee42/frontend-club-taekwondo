import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

// Interface pour représenter un utilisateur
interface Utilisateur {
  id: number;
  nom: string;
  prenom: string;
  email: string;
}

@Component({
  selector: 'app-dashboard-membre',
  standalone: true,
  templateUrl: './dashboard-membre.component.html',
  styleUrls: ['./dashboard-membre.component.css'],
  imports: [CommonModule]
})
export class DashboardMembreComponent implements OnInit {
  utilisateurConnecte: Utilisateur | null = null;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.loadUtilisateurConnecte();

    // Vérifie que l'utilisateur a bien le rôle MEMBRE
    const role = localStorage.getItem('role');
    if (role !== 'MEMBRE') {
      alert('Accès refusé. Vous n\'êtes pas autorisé à accéder à cette section.');
      this.router.navigate(['/connexion']);
    }
  }

  // Récupère les infos du membre connecté
  loadUtilisateurConnecte() {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Utilisateur non connecté.');
      this.router.navigate(['/connexion']);
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
        this.router.navigate(['/connexion']);
      }
    });
  }

  // Redirections vers les pages liées
  navigateToDocuments() {
    this.router.navigate(['/membre/documents']);
  }

  navigateToPaiements() {
    this.router.navigate(['/membre/paiements']);
  }

  navigateToCommandes() {
    this.router.navigate(['/membre/commandes']);
  }

  navigateToEvenements() {
    this.router.navigate(['/membre/evenements']);
  }
}
