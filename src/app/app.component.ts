import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Pour *ngIf
import { RouterModule } from '@angular/router'; // Pour router-outlet
import { HeaderComponent } from './layout/header/header.component'; // Importer le header
import { FooterComponent } from './layout/footer/footer.component'; // Importer le footer
import { Router, NavigationEnd } from '@angular/router';
import { ParametresPaiementService } from './services/parametres-paiement.service'; // adapte le chemin si besoin


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
  isProfilRoute: boolean = false;
  title(title: any) {
    throw new Error('Method not implemented.');
  }
  isLoggedIn: boolean = false; // Vérifie si l'utilisateur est connecté
  userRole: string | null = ''; // Rôle de l'utilisateur, "admin" ou "membre"
  isAdminOrMembreRoute: boolean = false; // Indique si la route actuelle est admin ou membre

  constructor(
    private router: Router,
    private parametresService: ParametresPaiementService // ✅ injection du service
  ) {}
  

  ngOnInit(): void {
    // 🔐 Vérifie connexion
    this.isLoggedIn = !!localStorage.getItem('token');
    this.userRole = localStorage.getItem('role');
  
    // 📦 Charge les paramètres de paiement une seule fois
    this.parametresService.chargerParametres();
  
    // 🔄 Surveille les routes
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.isAdminOrMembreRoute = event.url.startsWith('/admin') || event.url.startsWith('/membre');
        this.isProfilRoute = event.url.startsWith('/profil');
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