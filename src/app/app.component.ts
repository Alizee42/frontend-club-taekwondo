import { Component, OnInit, Renderer2 } from '@angular/core';
import { ClubService, Club } from './services/club.service';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { ToastContainerComponent } from './shared/toast/toast-container/toast-container.component'; // <-- AJOUT
import { ClubSelectComponent } from './club-select/club-select.component';


import { HeaderComponent } from './layout/header/header.component';
import { ConnectedHeaderComponent } from './components/shared/connected-header/connected-header.component';
import { FooterComponent } from './layout/footer/footer.component';

import { ParametresPaiementService } from './services/parametres-paiement.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    HeaderComponent,
    ConnectedHeaderComponent,
    FooterComponent,
    ToastContainerComponent,
    ClubSelectComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  isLoggedIn = false;
  userRole: 'admin' | 'membre' | 'parent' | null = null;
  connectedRole: 'admin' | 'membre' | 'parent' = 'membre'; // par défaut
  isConnectedRoute = false;
  selectedClub: Club | null = null;
  showClubModal = false;

  constructor(
    private router: Router,
    private parametresService: ParametresPaiementService,
    private renderer: Renderer2,
    private clubService: ClubService
  ) {}

  ngOnInit(): void {
    // Sélection du club obligatoire
    this.selectedClub = this.clubService.getSelectedClub();
    this.showClubModal = !this.selectedClub;

    // Vérifie la connexion
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role')?.toLowerCase();

    this.isLoggedIn = !!token;

    if (role === 'admin' || role === 'membre' || role === 'parent') {
      this.userRole = role;
      this.connectedRole = role;
    }

    // ✅ Charge les paramètres globaux SEULEMENT si l'utilisateur est connecté
    // et seulement pour les rôles qui en ont besoin (admin, paiements)
    if (token && (role === 'admin' || role === 'membre')) {
      try {
        this.parametresService.chargerParametres();
      } catch (error) {
        console.warn('⚠️ Impossible de charger les paramètres de paiement:', error);
      }
    }

    // Gère les routes connectées
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        const url = event.urlAfterRedirects;

        this.isConnectedRoute = [
          '/admin',
          '/membre',
          '/parent',
          '/profil'
        ].some(segment => url.includes(segment));

        // Appliquer classe d'uniformisation sur pages publiques hors accueil
        this.applyPublicPageClass(url);

        if (url.includes('/admin')) {
          this.connectedRole = 'admin';
        } else if (url.includes('/membre')) {
          this.connectedRole = 'membre';
        } else if (url.includes('/parent')) {
          this.connectedRole = 'parent';
        }
      }
    });
  }

  onClubSelected(club: Club) {
    this.selectedClub = club;
    this.showClubModal = false;
  }

  private applyPublicPageClass(url: string): void {
    const body = document.body;
    const isAccueil = url === '/' || url.startsWith('/?');
    const isConnected = this.isConnectedRoute;
    // Pages publiques standard où appliquer style : pas accueil, pas connectées
    if (!isAccueil && !isConnected) {
      this.renderer.addClass(body, 'public-page-standard');
    } else {
      this.renderer.removeClass(body, 'public-page-standard');
    }
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('email');
    localStorage.removeItem('utilisateur');
    this.isLoggedIn = false;
    this.router.navigate(['/connexion']);
  }
}
