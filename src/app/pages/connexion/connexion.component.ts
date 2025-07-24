import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-connexion',
  templateUrl: './connexion.component.html',
  styleUrls: ['./connexion.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class ConnexionComponent {
  email: string = '';
  password: string = '';

  constructor(private router: Router, private http: HttpClient) {}

  onSubmit(): void {
    console.log('Tentative de connexion avec :', { email: this.email, password: this.password });

    if (!this.email || !this.password) {
      alert('Veuillez remplir correctement tous les champs.');
      return;
    }

    if (!this.isValidEmail(this.email)) {
      alert('Veuillez fournir une adresse email valide.');
      return;
    }

    const loginData = {
      email: this.email,
      password: this.password
    };

    this.http.post<any>(
      'http://localhost:8080/api/utilisateurs/login',
      loginData
    ).subscribe({
      next: (response) => {
        console.log('Réponse reçue :', response);

        const token = response.token;
        const roles = response.roles || response.utilisateur?.roles; // Récupérer les rôles
        const utilisateur = response.utilisateur;

        // Stocker les données dans le localStorage
        this.storeUserData(token, roles, utilisateur);

        // Vérifier les rôles et rediriger
        this.redirectBasedOnRoles(roles);
      },
      error: (err) => {
        console.error('Erreur de connexion :', err);
        this.handleError(err);
      }
    });
  }

  private storeUserData(token: string, roles: any, utilisateur: any): void {
    if (token) {
      localStorage.setItem('token', token);
    }

    if (roles) {
      localStorage.setItem('roles', JSON.stringify(roles)); // Stocker les rôles sous forme de JSON
    }

    if (utilisateur) {
      localStorage.setItem('utilisateur', JSON.stringify(utilisateur));
      console.log('Utilisateur stocké dans localStorage :', utilisateur);

      if (utilisateur.email) {
        localStorage.setItem('email', utilisateur.email);
      }
    }
  }

  private redirectBasedOnRoles(roles: any): void {
    if (!roles || roles.length === 0) {
      alert('Aucun rôle trouvé. Veuillez contacter l\'administrateur.');
      return;
    }

    const rolesArray = Array.isArray(roles) ? roles : Array.from(roles);

    if (rolesArray.includes('ADMIN')) {
      this.router.navigate(['/admin/dashboard-admin']);
    } else if (rolesArray.includes('MEMBRE')) {
      this.router.navigate(['/membre/dashboard-membre']);
    } else if (rolesArray.includes('PARENT')) {
      this.router.navigate(['/parent/dashboard-parent']);
    } else {
      alert('Rôle inconnu. Veuillez contacter l\'administrateur.');
    }
  }

  private handleError(err: any): void {
    if (err.status === 401) {
      alert('Email ou mot de passe incorrect.');
    } else {
      alert('Une erreur est survenue. Veuillez réessayer plus tard.');
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}