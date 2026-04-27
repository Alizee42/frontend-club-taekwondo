import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';

@Component({
  selector: 'app-mot-de-passe-oublie',
  standalone: true,
  imports: [CommonModule, FormsModule, UiButtonComponent],
  templateUrl: './mot-de-passe-oublie.component.html',
  styleUrls: ['./mot-de-passe-oublie.component.css']
})
export class MotDePasseOublieComponent {
  email = '';
  loading = false;
  message = '';
  isSuccess = false;
  isError = false;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  onSubmit(): void {
    if (!this.email || !this.isValidEmail(this.email)) {
      this.showError('Veuillez saisir une adresse email valide.');
      return;
    }

    this.loading = true;
    this.resetMessages();

    const url = `${environment.apiUrl}/reinitialisation/demander`;
    
    this.http.post<{ message: string }>(url, null, {
      params: { email: this.email }
    }).subscribe({
      next: (response) => {
        this.loading = false;
        this.showSuccess('Un email de réinitialisation a été envoyé à votre adresse. Vérifiez votre boîte de réception.');
        this.email = ''; // Vider le champ pour la sécurité
      },
      error: (error) => {
        this.loading = false;
        const errorMessage = error?.error?.message || 'Une erreur est survenue. Veuillez réessayer.';
        this.showError(errorMessage);
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/connexion']);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private showSuccess(message: string): void {
    this.message = message;
    this.isSuccess = true;
    this.isError = false;
  }

  private showError(message: string): void {
    this.message = message;
    this.isError = true;
    this.isSuccess = false;
  }

  private resetMessages(): void {
    this.message = '';
    this.isSuccess = false;
    this.isError = false;
  }
}
