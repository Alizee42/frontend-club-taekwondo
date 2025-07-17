import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-connected-header',
  templateUrl: './connected-header.component.html',
  styleUrls: ['./connected-header.component.css']
})
export class ConnectedHeaderComponent {
  @Input() role: 'admin' | 'membre' = 'membre';

  constructor(private router: Router) {}

  goToDashboard() {
    this.router.navigate([this.role === 'admin' ? '/admin/dashboard' : '/membre/dashboard']);
  }

  goToHome() {
    this.router.navigate(['/']);
  }

  goToProfil() {
    this.router.navigate([this.role === 'admin' ? '/admin/profil' : '/membre/profil']);
  }

  logout() {
    // ici tu peux ajouter un AuthService.logout()
    localStorage.clear();
    this.router.navigate(['/connexion']);
  }
}
