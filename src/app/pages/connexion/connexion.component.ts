// src/app/pages/connexion/connexion.component.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MembreService } from '../../services/membre.service';
import { AuthService } from '../../services/auth.service';
import { ClubService } from '../../services/club.service';
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
  email: string = '';
  password: string = '';
  clubId: number | undefined = undefined;
  clubs: Array<{ id: number; nom: string }> = [
    { id: 1, nom: 'Club 1' },
    { id: 2, nom: 'Club 2' },
    { id: 3, nom: 'Club 3' },
    { id: 4, nom: 'Club 4' }
  ];
  showPassword: boolean = false;

  constructor(
    private router: Router,
    private http: HttpClient,
    private membreService: MembreService,
    private authService: AuthService,
    private toastService: ToastService,
    private clubService: ClubService
  ) {
    // Récupère l'ID du club sélectionné au chargement
    const selectedClub = this.clubService.getSelectedClub();
    if (selectedClub) {
      this.clubId = selectedClub.id;
    }
  }

  onSubmit(): void {
    if (!this.email || !this.password) { 
      return; 
    }
    if (this.clubId === undefined) {
      this.toastService.error('Veuillez sélectionner un club avant de vous connecter.');
      return;
    }
    if (!this.isValidEmail(this.email)) { 
      this.toastService.error('Adresse email invalide');
      return; 
    }
      // Envoie le clubId sélectionné avec l'email et le mot de passe
      const payload = {
        email: this.email,
        password: this.password,
        clubId: this.clubId !== undefined ? this.clubId : undefined
      };
      this.authService.login(payload)

      // Login classique : envoie uniquement l'email
      this.authService.login({ email: this.email, password: this.password })
        .subscribe({
          next: (response) => {
            // Vérification club sauf pour SUPER_ADMIN
            const userClubId = response.utilisateur?.['clubId'];
            const role = response.role || response.utilisateur?.role || '';
            if (role.toString().toUpperCase() !== 'SUPER_ADMIN' && this.clubId !== undefined && userClubId !== this.clubId) {
              this.toastService.error('❌ Ce compte n’appartient pas au club sélectionné.');
              return;
            }
            this.toastService.success('🎉 Connexion réussie ! Bienvenue !');
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


  
togglePassword() { this.showPassword = !this.showPassword; }

}
