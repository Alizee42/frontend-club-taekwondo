import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Pour *ngIf
import { RouterModule } from '@angular/router'; // Pour router-outlet
import { HeaderComponent } from './layout/header/header.component'; // Importer le header
import { FooterComponent } from './layout/footer/footer.component'; // Importer le footer
import { Router, NavigationEnd } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true, // Déclare le composant comme autonome
  imports: [
    CommonModule, // Pour les directives comme *ngIf
    RouterModule, // Pour router-outlet
    HeaderComponent, // Header général
    FooterComponent, // Footer général
  ]
})
export class AppComponent {
  title(title: any) {
    throw new Error('Method not implemented.');
  }
  isLoggedIn: boolean = false; // Vérifie si l'utilisateur est connecté
  userRole: string | null = ''; // Rôle de l'utilisateur, "admin" ou "membre"
  isAdminOrMembreRoute: boolean = false; // Indique si la route actuelle est admin ou membre

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Vérifie la présence du token dans le localStorage pour déterminer si l'utilisateur est connecté
    this.isLoggedIn = !!localStorage.getItem('token');
    this.userRole = localStorage.getItem('role');

    // Écoute les changements de route
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        // Vérifie si la route actuelle est une route admin ou membre
        this.isAdminOrMembreRoute = event.url.startsWith('/admin') || event.url.startsWith('/membre');
      }
    });
  }

  // Méthode pour se déconnecter
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    this.isLoggedIn = false;
    this.router.navigate(['/connexion']);
  }
}