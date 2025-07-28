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
  userRole: 'admin' | 'membre' | 'parent' | null = null;
  connectedRole: 'admin' | 'membre' | 'parent' = 'membre'; // par défaut
  isConnectedRoute = false;

  constructor(
    private router: Router,
    private parametresService: ParametresPaiementService
  ) {}

  ngOnInit(): void {
    // Vérifie la connexion
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role')?.toLowerCase();

    this.isLoggedIn = !!token;

    if (role === 'admin' || role === 'membre' || role === 'parent') {
      this.userRole = role;
      this.connectedRole = role;
    }

    // Charge les paramètres globaux
    this.parametresService.chargerParametres();

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

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('email');
    localStorage.removeItem('utilisateur');
    this.isLoggedIn = false;
    this.router.navigate(['/connexion']);
  }
}
