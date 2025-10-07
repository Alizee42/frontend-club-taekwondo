// src/app/pages/connexion/connexion.component.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MembreService } from '../../services/membre.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../shared/toast/toast.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';

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
    private membreService: MembreService,
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  onSubmit(): void {
    if (!this.email || !this.password) { 
      return; 
    }
    if (!this.isValidEmail(this.email)) { 
      this.toastService.error('Adresse email invalide');
      return; 
    }

    console.log('[CONNEXION] Tentative de connexion avec:', this.email);

    // ✅ Utiliser le AuthService au lieu de la requête HTTP directe
    this.authService.login({ email: this.email, password: this.password })
      .subscribe({
        next: (response) => {
          console.log('[CONNEXION] Connexion réussie :', response);
          
          this.toastService.success('🎉 Connexion réussie ! Bienvenue !');
          
          // ✅ Le token est déjà stocké par le AuthService, juste faire la redirection
          const role = response.role || response.utilisateur?.role || '';
          this.redirectBasedOnRole(role.toString().toUpperCase());
        },
        error: (err) => {
          console.error('[CONNEXION] ❌ Login échoué', err);
          this.handleError(err);
        }
      });
  }

  private redirectBasedOnRole(role: string): void {
    switch (role) {
      case 'ADMIN':
        this.router.navigate(['/admin/dashboard-admin']);
        break;
      case 'SUPER_ADMIN':
        this.router.navigate(['/super-admin/dashboard-super-admin']);
        break;
      case 'MEMBRE':
        this.router.navigate(['/membre/dashboard-membre']);
        break;
      case 'PARENT':
        this.router.navigate(['/parent/dashboard-parent']);
        break;
      default:
        this.toastService.error('⚠️ Accès non autorisé. Contactez l\'administrateur.');
    }
  }

  private handleError(err: any): void {
    if (err?.status === 401) {
      this.toastService.error('❌ Identifiants incorrects');
    } else {
      this.toastService.error('⚠️ Erreur de connexion. Veuillez réessayer.');
    }
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  showPassword = false;

  
togglePassword() { this.showPassword = !this.showPassword; }

}
