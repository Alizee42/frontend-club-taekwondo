import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';

import { HeaderComponent } from './layout/header/header.component';
import { FooterComponent } from './layout/footer/footer.component';
import { ConnectedHeaderComponent } from './components/shared/connected-header/connected-header.component';

import { ParametresPaiementService } from './services/parametres-paiement.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    HeaderComponent,
    FooterComponent,
    ConnectedHeaderComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  isLoggedIn = false;
  userRole: 'admin' | 'membre' | null = null;
  connectedRole: 'admin' | 'membre' = 'membre';

  isConnectedRoute = false; // ✅ Nouvelle variable unifiée

  constructor(
    private router: Router,
    private parametresService: ParametresPaiementService
  ) {}

  ngOnInit(): void {
    // Vérifie la connexion
    this.isLoggedIn = !!localStorage.getItem('token');
    const role = localStorage.getItem('role');
    this.userRole = role === 'admin' || role === 'membre' ? role : null;
    if (this.userRole) {
      this.connectedRole = this.userRole;
    }

    // Charge les paramètres globaux
    this.parametresService.chargerParametres();

    // Détecte les routes connectées (admin, membre ou profil)
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        const url = event.urlAfterRedirects;
        this.isConnectedRoute = 
          url.includes('/admin') || url.includes('/membre') || url.includes('/profil');

        if (url.includes('/admin')) {
          this.connectedRole = 'admin';
        } else if (url.includes('/membre')) {
          this.connectedRole = 'membre';
        }
      }
    });
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    this.isLoggedIn = false;
    this.router.navigate(['/connexion']);
  }
}
