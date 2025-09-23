import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient} from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';



interface Utilisateur {
  id: number | string;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;        // <-- ajouté
  dateNaissance?: string;    // <-- ajouté (ISO yyyy-MM-dd)
  role?: string;
}

@Component({
  standalone: true,
  selector: 'app-dashboard-membre',
  templateUrl: './dashboard-membre.component.html',
  styleUrls: ['./dashboard-membre.component.css'],
  imports: [CommonModule, FormsModule],
})
export class DashboardMembreComponent implements OnInit {
  private readonly API_BASE = environment.apiUrl;

  utilisateurConnecte: Utilisateur | null = null;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.loadUtilisateur();
  }

    private loadUtilisateur(): void {
    const token = localStorage.getItem('token'); // Récupérer le token depuis le localStorage
    if (!token) {
      console.error('Token manquant. Redirection vers la page de connexion.');
      this.router.navigate(['/connexion']); // Rediriger si le token est manquant
      return;
    }
  
    const headers = { Authorization: `Bearer ${token}` }; // Ajouter le token dans les en-têtes
  
    this.http.get<Utilisateur>(`${this.API_BASE}/utilisateurs/me`, { headers }).subscribe({
      next: (u) => {
        console.log('Utilisateur récupéré avec succès :', u);
        this.utilisateurConnecte = u;
      },
      error: (err) => {
        console.error('Erreur lors de la récupération de l\'utilisateur :', err);
        if (err.status === 401) {
          console.warn('Token invalide ou expiré. Redirection vers la page de connexion.');
          this.router.navigate(['/connexion']); // Rediriger si le token est invalide
        }
      }
    });
  }

    private normalizeUser(u: any): Utilisateur {
    return {
      id: u?.id ?? u?._id ?? u?.uuid,
      nom: (u?.nom ?? u?.lastName ?? '').trim(),
      prenom: (u?.prenom ?? u?.firstName ?? '').trim(),
      email: u?.email ?? '',
      telephone: u?.telephone ?? '',
      dateNaissance: u?.dateNaissance ?? undefined,
      role: u?.role ?? '',
    };
  }

  // Handlers communs
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
