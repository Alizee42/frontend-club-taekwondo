import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import { DashboardCardComponent } from '../../dashboard/shared/dashboard-card/dashboard-card.component';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

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
  imports: [CommonModule, DashboardCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardParentComponent implements OnInit, OnDestroy {
  utilisateurConnecte: Utilisateur | null = null;
  private authSubscription?: Subscription;
  // Stats placeholders
  stats = {
    paiementsEnRetard: 0,
    documentsManquants: 2,
    commandesEnCours: 0,
    evenementsAVenir: 1
  };

  constructor(private http: HttpClient, private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    console.log('[👨‍👧 DASHBOARD PARENT] Initialisation...');
    
    const role = localStorage.getItem('role');
    console.log('[🧪 ROLE DÉTECTÉ]', role);

    if (role !== 'PARENT') {
      alert('Accès refusé. Vous n\'êtes pas autorisé à accéder à cette section.');
      this.router.navigate(['/connexion']);
      return;
    }

    // Attendre que le service d'auth soit prêt en utilisant un observable
    this.authSubscription = this.authService.authState$.subscribe(authState => {
      console.log('[👨‍👧 DASHBOARD PARENT] État auth reçu:', authState);
      
      if (authState.isConnecte && authState.user) {
        console.log('[👨‍👧 DASHBOARD PARENT] Utilisateur connecté depuis authState');
        this.utilisateurConnecte = authState.user as Utilisateur;
      } else if (authState.isConnecte === false) {
        console.log('[👨‍👧 DASHBOARD PARENT] Utilisateur non connecté depuis authState');
        // Ne pas rediriger immédiatement, essayer de charger d'abord
        this.loadUtilisateurConnecte();
      }
    });

    // Aussi essayer de charger directement
    setTimeout(() => {
      if (!this.utilisateurConnecte) {
        this.loadUtilisateurConnecte();
      }
    }, 500);
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  // 🔐 Récupère les infos du parent connecté
  loadUtilisateurConnecte(): void {
    console.log('[👨‍👧 DASHBOARD PARENT] Vérification de l\'authentification...');
    
    // Vérifier les données dans localStorage
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const user = localStorage.getItem('utilisateur');
    
    console.log('[👨‍👧 DASHBOARD PARENT] LocalStorage - Token:', token ? 'présent' : 'absent');
    console.log('[�‍👧 DASHBOARD PARENT] LocalStorage - Role:', role);
    console.log('[👨‍👧 DASHBOARD PARENT] LocalStorage - User:', user ? 'présent' : 'absent');
    
    // �🔹 Vérifier via le service d'authentification
    const isConnected = this.authService.isConnecte();
    console.log('[👨‍👧 DASHBOARD PARENT] Service isConnecte():', isConnected);
    
    if (!isConnected) {
      console.warn('[👨‍👧 DASHBOARD PARENT] Utilisateur non connecté.');
      this.router.navigate(['/connexion']);
      return;
    }

    // 🔹 Récupérer l'utilisateur depuis le service d'abord
    const serviceUser = this.authService.getUtilisateurConnecte();
    console.log('[👨‍👧 DASHBOARD PARENT] Utilisateur depuis service:', serviceUser);
    
    if (serviceUser) {
      this.utilisateurConnecte = serviceUser as Utilisateur;
      localStorage.setItem('utilisateurId', serviceUser.id.toString());
      console.log('[👨‍👧 DASHBOARD PARENT] Utilisateur récupéré depuis le service :', serviceUser);
      return;
    }

    // 🔹 Si pas d'utilisateur dans le service, faire une requête API
    if (!token) {
      console.warn('[👨‍👧 DASHBOARD PARENT] Pas de token disponible');
      this.router.navigate(['/connexion']);
      return;
    }

    console.log('[👨‍👧 DASHBOARD PARENT] Récupération via API...');
    this.http.get<Utilisateur>(`${environment.apiUrl}/utilisateurs/me`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (utilisateur) => {
        console.log('[👨‍👧 DASHBOARD PARENT] Utilisateur récupéré via API:', utilisateur);
        this.utilisateurConnecte = utilisateur;
        localStorage.setItem('utilisateurId', utilisateur.id.toString());
      },
      error: (err) => {
        console.error('[👨‍👧 DASHBOARD PARENT] Erreur lors de la récupération de l\'utilisateur connecté :', err);
        // 🚫 SUPPRIMÉ: Pas de redirection manuelle, l'intercepteur s'en charge
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

  navigateToEvenements(): void {
    this.router.navigate(['/parent/evenements']);
  }


}