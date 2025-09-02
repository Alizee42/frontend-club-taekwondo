import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

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
  imports: [CommonModule, FormsModule, HttpClientModule, DatePipe],
})
export class DashboardMembreComponent implements OnInit {
  private readonly API_BASE = '/api';

  utilisateurConnecte: Utilisateur | null = null;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.loadUtilisateur();
  }

  private loadUtilisateur(): void {
    // Adapter l’endpoint à ton backend si besoin (ex: /api/auth/me)
    this.http.get<Utilisateur | any>(`${this.API_BASE}/utilisateurs/me`).subscribe({
      next: (u: any) => {
        this.utilisateurConnecte = this.normalizeUser(u);
      },
      error: () => {
        // fallback: rien de bloquant pour la compilation/affichage
        this.utilisateurConnecte = null;
      }
    });
  }

  private normalizeUser(u: any): Utilisateur {
    return {
      id: u?.id ?? u?._id ?? u?.uuid,
      nom: (u?.nom ?? '').trim(),
      prenom: (u?.prenom ?? '').trim(),
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
