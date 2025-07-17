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
    console.log('Email fourni :', this.email);
    console.log('Mot de passe fourni :', this.password);
  
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
  
        const role = response.role || response.utilisateur?.role;
  
        if (response.token) {
          localStorage.setItem('token', response.token);
        }
  
        if (role) {
          localStorage.setItem('role', role);
        }
  
        if (response.utilisateur) {
          const utilisateur = response.utilisateur;
          localStorage.setItem('utilisateur', JSON.stringify(utilisateur));
          console.log('Utilisateur stocké dans localStorage :', localStorage.getItem('utilisateur'));
  
          // ✅ Stocker l'email pour l'inscription à l'événement
          if (utilisateur.email) {
            localStorage.setItem('email', utilisateur.email);
          }
        }
  
        const roleLower = role?.toLowerCase();
  
        if (roleLower === 'admin') {
          this.router.navigate(['/admin/dashboard-admin']).then(() => {
            window.location.reload(); // Recharge la page pour synchroniser l'état
          });
        } else if (roleLower === 'membre') {
          this.router.navigate(['/membre/dashboard-membre']).then(() => {
            window.location.reload(); // Recharge la page pour synchroniser l'état
          });
        } else {
          alert('Rôle inconnu. Veuillez contacter l\'administrateur.');
        }
      },
      error: (err) => {
        console.error('Erreur de connexion :', err);
        if (err.status === 401) {
          alert('Email ou mot de passe incorrect.');
        } else {
          alert('Une erreur est survenue. Veuillez réessayer plus tard.');
        }
      }
    });
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}