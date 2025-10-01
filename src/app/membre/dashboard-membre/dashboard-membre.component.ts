import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient} from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { DashboardCardComponent } from '../../dashboard/shared/dashboard-card/dashboard-card.component';
import { AuthService } from '../../services/auth.service';



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
  imports: [CommonModule, FormsModule, DashboardCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardMembreComponent implements OnInit {
  private readonly API_BASE = environment.apiUrl;

  utilisateurConnecte: Utilisateur | null = null;
  // Stats placeholders (seront remplacées par un service agrégateur plus tard)
  stats: {
    paiementsEnRetard: number;
    documentsManquants: number;
    commandesEnCours: number;
    evenementsAVenir: number;
  } = {
    paiementsEnRetard: 0,
    documentsManquants: 1,
    commandesEnCours: 0,
    evenementsAVenir: 2
  };

  constructor(private http: HttpClient, private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    this.loadUtilisateur();
  }

    private loadUtilisateur(): void {
    // 🔹 On vérifie juste que l'utilisateur est connecté via le service
    // L'intercepteur gère automatiquement les erreurs 401
    if (!this.authService.isConnecte()) {
      console.warn('Utilisateur non connecté. Redirection vers la page de connexion.');
      this.router.navigate(['/connexion']);
      return;
    }

    // 🔹 Récupérer l'utilisateur depuis le service (plus fiable)
    const user = this.authService.getUtilisateurConnecte();
    if (user) {
      this.utilisateurConnecte = this.normalizeUser(user);
      console.log('Utilisateur récupéré depuis le service :', user);
    } else {
      // 🔹 Si pas d'utilisateur dans le service, faire une requête
      this.loadUserFromAPI();
    }
  }

  private loadUserFromAPI(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}` };

    this.http.get<Utilisateur>(`${this.API_BASE}/utilisateurs/me`, { headers }).subscribe({
      next: (u) => {
        console.log('Utilisateur récupéré avec succès :', u);
        this.utilisateurConnecte = this.normalizeUser(u);
      },
      error: (err) => {
        console.error('Erreur lors de la récupération de l\'utilisateur :', err);
        // 🚫 SUPPRIMÉ: Pas de redirection manuelle, l'intercepteur s'en charge
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
