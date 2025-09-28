import { Component, Input, OnInit } from '@angular/core';
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
    // ⚠️ On n’impose plus une redirection vers /connexion dans le header.
    // Sinon au moindre petit souci de token/role, l’utilisateur saute.
    // La sécurité reste gérée via tes guards Angular + backend.
  }

  /** Récupère le rôle stocké */
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
        this.router.navigate(['/connexion']);
        break;
    }
  }

  goToHome(): void {
    // ✅ Correction : on va directement à l’accueil public
    // sans vérifier le token ni toucher à la session
    this.router.navigate(['/accueil']); // adapte selon ta route publique
  }

  goToProfil(): void {
    this.router.navigate(['/profil']);
  }

  logout(): void {
    // Nettoyage des infos d’auth seulement au logout
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.ROLE_KEY);
    localStorage.removeItem(this.USER_KEY);
    sessionStorage.removeItem(this.TOKEN_KEY);

    this.router.navigate(['/connexion'], { replaceUrl: true });
  }
}
