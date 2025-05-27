import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common'; // Importer CommonModule pour *ngIf

interface Utilisateur {
  id: number;
  nom: string;
  prenom: string;
  email: string;
}

@Component({
  selector: 'app-dashboard-admin',
  standalone: true, // Indique que le composant est standalone
  templateUrl: './dashboard-admin.component.html',
  styleUrls: ['./dashboard-admin.component.css'],
  imports: [CommonModule] // Ajoutez CommonModule ici
})
export class DashboardAdminComponent implements OnInit {
  administrateurConnecte: Utilisateur | null = null; // Stocke les informations de l'utilisateur connecté

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    this.loadAdministrateurConnecte();
  }

  // Charger les informations de l'utilisateur connecté
  loadAdministrateurConnecte(): void {
    const token = localStorage.getItem('token');
    console.log('Token récupéré :', token); // Vérifiez si le token est présent
    if (!token) {
      alert('Administrateur non connecté.');
      return;
    }
  
    this.http.get<Utilisateur>('http://localhost:8080/api/utilisateurs/me', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (utilisateur) => {
        this.administrateurConnecte = utilisateur;
      },
      error: (err) => {
        console.error('Erreur lors de la récupération de l\'administrateur connecté :', err);
        alert('Impossible de récupérer les informations de l\'administrateur connecté.');
      }
    });
  }

  navigateToHoraires(): void {
    this.router.navigate(['/admin/horaires']); // Redirige vers la page Gestion des Horaires
  }
  navigateToprofesseurs(): void {
    this.router.navigate(['/admin/professeurs']); // Redirige vers la page Gestion des Professeurs
  }
  navigateToavis(): void {
    this.router.navigate(['/admin/avis']); // Redirige vers la page Gestion des Avis
  }
  navigateToActualites(): void {
    this.router.navigate(['/admin/actualites']); // Redirige vers la page Gestion des Actualités
  }
  navigateToGalerie(): void {
    this.router.navigate(['/admin/galerie']); // Redirige vers la page Gestion de la Galerie
  }
  navigateToDocument(): void {
    this.router.navigate(['/admin/documents']); // Redirige vers la page Gestion des Documents
  }
  navigateToPaiement(): void {
    this.router.navigate(['/admin/paiements']); // Redirige vers la page Gestion des Documents
  }
}