import { Component, Input, OnInit, Optional } from '@angular/core';
import { Router } from '@angular/router';

type RoleUp = 'ADMIN' | 'MEMBRE' | 'PARENT';

@Component({
  selector: 'app-connected-header',
  templateUrl: './connected-header.component.html',
  styleUrls: ['./connected-header.component.css']
})
export class ConnectedHeaderComponent implements OnInit {
  @Input() role: 'admin' | 'membre' | 'parent' = 'membre';

  // Clés de stockage centralisées
  private readonly ROLE_KEY = 'role';
  private readonly TOKEN_KEY = 'token';
  private readonly USER_KEY = 'user'; // si tu stockes un user JSON

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Si un @Input est passé, on peut éventuellement l'aligner avec le stockage
    const stored = this.getStoredRole();
    if (!stored && this.role) {
      // Si rien en storage et qu'un rôle d'entrée existe, on peut le pousser
      localStorage.setItem(this.ROLE_KEY, this.role.toUpperCase());
    }
  }

  /** Récupère le rôle en storage, normalisé et sécurisé */
  private getStoredRole(): RoleUp | null {
    const raw = localStorage.getItem(this.ROLE_KEY);
    if (!raw) return null;
    const up = raw.trim().toUpperCase();
    if (up === 'ADMIN' || up === 'MEMBRE' || up === 'PARENT') return up;
    return null;
  }

  goToDashboard(): void {
    const storedRole = this.getStoredRole();
    switch (storedRole) {
      case 'ADMIN':
        this.router.navigate(['/admin/dashboard-admin']);
        break;
      case 'MEMBRE':
        this.router.navigate(['/membre/dashboard-membre']);
        break;
      case 'PARENT':
        this.router.navigate(['/parent/dashboard-parent']);
        break;
      default:
        // Rôle inconnu → on renvoie vers connexion
        this.router.navigate(['/connexion']);
        break;
    }
  }

  goToHome(): void {
    // Navigation SPA (aucun reload, on conserve la session)
    this.router.navigate(['/']);
  }

  goToProfil(): void {
    this.router.navigate(['/profil']);
  }

  logout(): void {
    // Supprimer uniquement ce qui concerne l’auth (évite localStorage.clear())
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.ROLE_KEY);
    localStorage.removeItem(this.USER_KEY);
    sessionStorage.removeItem(this.TOKEN_KEY); // si tu l’avais mis en session

    // Redirection propre (remplace l’URL pour éviter "retour" vers une page protégée)
    this.router.navigate(['/connexion'], { replaceUrl: true });
  }
}
