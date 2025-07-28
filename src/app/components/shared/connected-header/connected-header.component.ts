import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-connected-header',
  templateUrl: './connected-header.component.html',
  styleUrls: ['./connected-header.component.css']
})
export class ConnectedHeaderComponent {
  @Input() role: 'admin' | 'membre' | 'parent' = 'membre';

  constructor(private router: Router) {}

  goToDashboard(): void {
    const role = localStorage.getItem('role')?.toUpperCase();
    if (role === 'ADMIN') {
      this.router.navigate(['/admin/dashboard-admin']);
    } else if (role === 'MEMBRE') {
      this.router.navigate(['/membre/dashboard-membre']);
    } else if (role === 'PARENT') {
      this.router.navigate(['/parent/dashboard-parent']);
    } else {
      this.router.navigate(['/connexion']);
    }
  }
  
  
  goToHome() {
    this.router.navigate(['/']);
  }

  goToProfil() {
    this.router.navigate(['/profil']);
  }
  logout() {
    // ici tu peux ajouter un AuthService.logout()
    localStorage.clear();
    this.router.navigate(['/connexion']);
  }
}
