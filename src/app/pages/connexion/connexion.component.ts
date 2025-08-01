import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MembreService } from '../../services/membre.service'; // ✅ import service

@Component({
  selector: 'app-connexion',
  templateUrl: './connexion.component.html',
  styleUrls: ['./connexion.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class ConnexionComponent {
  email: string = '';
  password: string = '';

  constructor(
    private router: Router,
    private http: HttpClient,
    private membreService: MembreService
  ) {}

  onSubmit(): void {
    console.log('🔑 Tentative de connexion avec :', {
      email: this.email,
      password: this.password,
    });

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
      password: this.password,
    };

    this.http
      .post<any>('http://localhost:8080/api/utilisateurs/login', loginData)
      .subscribe({
        next: (response) => {
          console.log('✅ Réponse reçue du backend :', response);

          const token = response.token;
          const utilisateur = response.utilisateur;

          console.log('🧾 Utilisateur reçu :', utilisateur);

          const rawRole = response.role || utilisateur?.role || '';
          const role = rawRole?.trim().toUpperCase() || '';
          console.log('📦 Rôle formaté :', role);

          if (!role) {
            console.warn('❌ Aucun rôle détecté après formatage.');
            alert("Rôle non détecté. Veuillez contacter l'administrateur.");
            return;
          }

          this.storeUserData(token, role, utilisateur);
        },
        error: (err) => {
          console.error('❌ Erreur lors de la requête POST :', err);
          this.handleError(err);
        },
      });
  }

  private storeUserData(token: string, role: string, utilisateur: any): void {
    console.log('📥 Stockage du token, rôle et utilisateur dans le localStorage');

    if (token) localStorage.setItem('token', token);
    if (role) localStorage.setItem('role', role);
    if (utilisateur) {
      localStorage.setItem('utilisateur', JSON.stringify(utilisateur));
      if (utilisateur.email) {
        localStorage.setItem('email', utilisateur.email);
      }

      // ✅ Appel à /api/membres/me au lieu de /utilisateur/{id}
      this.membreService.getMembreConnecte().subscribe({
        next: (membre) => {
          if (membre?.id) {
            localStorage.setItem('membreId', String(membre.id));
            console.log("✅ membreId stocké :", membre.id);
          } else {
            console.warn("⚠ Aucun membre retourné.");
            localStorage.removeItem('membreId');
          }
          this.redirectBasedOnRole(role);
        },
        error: (err) => {
          console.error("❌ Erreur récupération membre connecté :", err);
          localStorage.removeItem('membreId');
          this.redirectBasedOnRole(role);
        }
      });
    }
  }

  private redirectBasedOnRole(role: string): void {
    switch (role) {
      case 'ADMIN':
        console.log('➡️ Redirection vers /admin/dashboard-admin');
        this.router.navigate(['/admin/dashboard-admin']);
        break;
      case 'MEMBRE':
        console.log('➡️ Redirection vers /membre/dashboard-membre');
        this.router.navigate(['/membre/dashboard-membre']);
        break;
      case 'PARENT':
        console.log('➡️ Redirection vers /parent/dashboard-parent');
        this.router.navigate(['/parent/dashboard-parent']);
        break;
      default:
        console.warn('⚠️ Rôle non reconnu :', role);
        alert("Rôle inconnu. Veuillez contacter l'administrateur.");
        break;
    }
  }

  private handleError(err: any): void {
    console.error('📛 Erreur de connexion détectée :', err);

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
