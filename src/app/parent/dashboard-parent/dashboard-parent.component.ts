import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

interface Utilisateur {
  id: number;
  nom: string;
  prenom: string;
  email: string;
}

@Component({
  selector: 'app-dashboard-parent',
  standalone: true,
  templateUrl: './dashboard-parent.component.html',
  styleUrls: ['./dashboard-parent.component.css'],
  imports: [CommonModule]
})
export class DashboardParentComponent implements OnInit {
  utilisateurConnecte: Utilisateur | null = null;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    console.log('[👨‍👧 DASHBOARD PARENT] Initialisation...');
    const role = localStorage.getItem('role');
    console.log('[🧪 ROLE DÉTECTÉ]', role);

    if (role !== 'PARENT') {
      alert('Accès refusé. Vous n\'êtes pas autorisé à accéder à cette section.');
      this.router.navigate(['/connexion']);
      return;
    }

    this.loadUtilisateurConnecte();
  }

  // 🔐 Récupère les infos du parent connecté
  loadUtilisateurConnecte(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Utilisateur non connecté.');
      this.router.navigate(['/connexion']);
      return;
    }

    this.http.get<Utilisateur>('/api/utilisateurs/me', {
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

  // 🔁 Redirections
  navigateToPaiements() {
    this.router.navigate(['/parent/paiements']); 
  }

  navigateToDocuments(): void {
    this.router.navigate(['/parent/documents']);
  }

  navigateToCommandes(): void {
    this.router.navigate(['/parent/commandes']);
  }
}
