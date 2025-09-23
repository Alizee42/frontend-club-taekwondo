// src/app/pages/connexion/connexion.component.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MembreService } from '../../services/membre.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment'; // ✅ ajout

@Component({
  selector: 'app-connexion',
  templateUrl: './connexion.component.html',
  styleUrls: ['./connexion.component.css'],
  standalone: true,
  imports: [FormsModule,CommonModule],
})
export class ConnexionComponent {
  email = '';
  password = '';

  constructor(
    private router: Router,
    private http: HttpClient,
    private membreService: MembreService
  ) {}

  onSubmit(): void {
    if (!this.email || !this.password) { alert('Veuillez remplir tous les champs.'); return; }
    if (!this.isValidEmail(this.email)) { alert('Email invalide.'); return; }

    this.http.post<any>(`${environment.apiUrl}/utilisateurs/login`, { email: this.email, password: this.password })
      .subscribe({
        next: (response) => {
          const token = (response?.token || '').trim();
          const utilisateur = response?.utilisateur || null;
          const rawRole = response?.role || utilisateur?.role || '';
          const role = String(rawRole || '').trim().toUpperCase();

          if (!token || !role) { alert('Connexion incomplète (token/role manquant).'); return; }

          this.storeUserData(token, role, utilisateur);
        },
        error: (err) => {
          console.error('❌ Login échoué', err);
          this.handleError(err);
        }
      });
  }

  private storeUserData(token: string, role: string, utilisateur: any): void {
    // ✅ unifier : on stocke token sous les deux clés (certaines pages lisent auth_token)
    localStorage.setItem('token', token);
    localStorage.setItem('auth_token', token);
    localStorage.setItem('role', role);
    console.log('Token stocké :', token);
console.log('Rôle stocké :', role);
    if (utilisateur) {
      localStorage.setItem('utilisateur', JSON.stringify(utilisateur));
      if (utilisateur.email) localStorage.setItem('email', utilisateur.email);
    }

    // récupérer (optionnel) le membre lié ; si 400/401 → silencieux
    this.membreService.getMembreConnecte().subscribe({
      next: (membre) => {
        if (membre?.id) localStorage.setItem('membreId', String(membre.id));
        this.redirectBasedOnRole(role);
      },
      error: (err) => {
        // ne pas faire peur en console pour 400/401
        if (err?.status === 400 || err?.status === 401) {
          console.debug('ℹ️ Membre non renvoyé (pas lié ou non requis).');
        } else {
          console.error('Erreur /membres/me', err);
        }
        localStorage.removeItem('membreId');
        this.redirectBasedOnRole(role);
      }
    });
  }

  private redirectBasedOnRole(role: string): void {
    switch (role) {
      case 'ADMIN':  this.router.navigate(['/admin/dashboard-admin']); break;
      case 'MEMBRE': this.router.navigate(['/membre/dashboard-membre']); break;
      case 'PARENT': this.router.navigate(['/parent/dashboard-parent']); break;
      default:
        alert("Rôle inconnu. Veuillez contacter l'administrateur.");
    }
  }

  private handleError(err: any): void {
    if (err?.status === 401) alert('Email ou mot de passe incorrect.');
    else alert('Une erreur est survenue. Réessayez plus tard.');
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  showPassword = false;

  
togglePassword() { this.showPassword = !this.showPassword; }

}
