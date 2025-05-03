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

  onSubmit() {
    console.log('Email fourni :', this.email);
    console.log('Mot de passe fourni :', this.password);

    if (this.email && this.password) {
      const formData = {
        email: this.email,
        password: this.password
      };

      this.http.post<any>('http://localhost:8080/api/utilisateurs/login', formData).subscribe({
        next: (response) => {
          console.log('Réponse complète reçue :', response);

          const role = response.role || response.user?.role;

          if (response.token) {
            localStorage.setItem('token', response.token);
          }
          if (role) {
            localStorage.setItem('role', role);
          }

          const roleLower = role?.toLowerCase();

          if (roleLower === 'admin') {
            this.router.navigate(['/admin/dashboard-admin']);
          } else if (roleLower === 'membre') {
            this.router.navigate(['/membre/dashboard-membre']);
          } else {
            alert('Rôle inconnu. Veuillez contacter l\'administrateur.');
          }
        },
        error: (err) => {
          console.error('Erreur de connexion :', err);
          alert('Email ou mot de passe incorrect.');
        }
      });
    } else {
      alert('Veuillez remplir correctement tous les champs.');
    }
  }
}