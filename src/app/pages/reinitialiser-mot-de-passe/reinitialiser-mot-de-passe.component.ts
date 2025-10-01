import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-reinitialiser-mot-de-passe',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reinitialiser-mot-de-passe.component.html',
  styleUrls: ['./reinitialiser-mot-de-passe.component.css']
})
export class ReinitialiserMotDePasseComponent implements OnInit {
  token = '';
  password = '';
  confirmPassword = '';
  loading = false;
  tokenValid = false;
  tokenChecked = false;
  showPassword = false;
  showConfirmPassword = false;
  message = '';
  isSuccess = false;
  isError = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Récupérer le token depuis l'URL
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      if (this.token) {
        this.verifyToken();
      } else {
        this.showError('Token manquant. Veuillez utiliser le lien reçu par email.');
      }
    });
  }

  verifyToken(): void {
    this.loading = true;
    const url = `${environment.apiUrl}/reinitialisation/verifier`;
    
    this.http.get(url, { params: { token: this.token } }).subscribe({
      next: (response) => {
        this.loading = false;
        this.tokenChecked = true;
        this.tokenValid = true;
        this.resetMessages();
      },
      error: (error) => {
        this.loading = false;
        this.tokenChecked = true;
        this.tokenValid = false;
        const errorMessage = error?.error?.message || 'Token invalide ou expiré.';
        this.showError(errorMessage);
      }
    });
  }

  onSubmit(): void {
    if (!this.validateForm()) {
      return;
    }

    this.loading = true;
    this.resetMessages();

    // Réinitialiser directement le mot de passe (validation incluse)
    this.updatePassword();
  }

  private updatePassword(): void {
    // Utiliser l'endpoint de réinitialisation de mot de passe
    const url = `${environment.apiUrl}/reinitialisation/reinitialiser-mot-de-passe`;
    
    this.http.post<{ message: string }>(url, null, {
      params: {
        token: this.token,
        newPassword: this.password
      }
    }).subscribe({
      next: (response) => {
        this.loading = false;
        this.showSuccess('Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.');
      },
      error: (error) => {
        this.loading = false;
        const errorMessage = error?.error?.message || 'Erreur lors de la mise à jour du mot de passe.';
        this.showError(errorMessage);
      }
    });
  }

  validateForm(): boolean {
    if (!this.password) {
      this.showError('Veuillez saisir un mot de passe.');
      return false;
    }

    if (!this.confirmPassword) {
      this.showError('Veuillez confirmer votre mot de passe.');
      return false;
    }

    if (this.password !== this.confirmPassword) {
      this.showError('Les mots de passe ne correspondent pas.');
      return false;
    }

    if (!this.isPasswordStrong(this.password)) {
      this.showError('Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.');
      return false;
    }

    return true;
  }

  isPasswordStrong(password: string): boolean {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
  }

  getPasswordStrength(): number {
    if (!this.password) return 0;
    
    let strength = 0;
    if (this.password.length >= 8) strength += 25;
    if (/[A-Z]/.test(this.password)) strength += 25;
    if (/[a-z]/.test(this.password)) strength += 25;
    if (/\d/.test(this.password)) strength += 12.5;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(this.password)) strength += 12.5;
    
    return Math.min(strength, 100);
  }

  getPasswordStrengthColor(): string {
    const strength = this.getPasswordStrength();
    if (strength < 25) return '#dc2626'; // Rouge
    if (strength < 50) return '#f59e0b'; // Orange
    if (strength < 75) return '#eab308'; // Jaune
    return '#10b981'; // Vert
  }

  // Méthodes de validation pour éviter les regex dans le template
  hasMinLength(): boolean {
    return !!(this.password && this.password.length >= 8);
  }

  hasUpperCase(): boolean {
    return !!(this.password && /[A-Z]/.test(this.password));
  }

  hasLowerCase(): boolean {
    return !!(this.password && /[a-z]/.test(this.password));
  }

  hasNumbers(): boolean {
    return !!(this.password && /\d/.test(this.password));
  }

  hasSpecialChar(): boolean {
    return !!(this.password && /[!@#$%^&*(),.?":{}|<>]/.test(this.password));
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  goToLogin(): void {
    this.router.navigate(['/connexion']);
  }

  requestNewLink(): void {
    this.router.navigate(['/mot-de-passe-oublie']);
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