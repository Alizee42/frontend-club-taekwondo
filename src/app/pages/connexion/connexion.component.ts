import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MembreService } from '../../services/membre.service'; // ✅ import service
import { FormsModule } from '@angular/forms';  // Import FormsModule pour ngModel

@Component({
  selector: 'app-connexion',
  templateUrl: './connexion.component.html',
  styleUrls: ['./connexion.component.css'],
  standalone: true,  // Indiquer que ce composant est standalone
  imports: [FormsModule],  // Ajouter FormsModule dans les imports
})
export class ConnexionComponent {
  email: string = '';
  password: string = '';

  constructor(
    private router: Router,
    private http: HttpClient,
    private membreService: MembreService
  ) {}

  // Soumission du formulaire de connexion
  onSubmit(): void {
    console.log('🔑 Tentative de connexion avec :', {
      email: this.email,
      password: this.password,
    });

    // Vérifications de validation des champs
    if (!this.email || !this.password) {
      alert('Veuillez remplir correctement tous les champs.');
      return;
    }

    if (!this.isValidEmail(this.email)) {
      alert('Veuillez fournir une adresse email valide.');
      return;
    }

    // Préparation des données de connexion
    const loginData = {
      email: this.email,
      password: this.password,
    };

    // Envoi des données de connexion au backend
    this.http
      .post<any>('/api/utilisateurs/login', loginData)
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

          // Stockage des données utilisateur dans le localStorage
          this.storeUserData(token, role, utilisateur);
        },
        error: (err) => {
          console.error('❌ Erreur lors de la requête POST :', err);
          this.handleError(err);
        },
      });
  }

  // Stockage des données de l'utilisateur après une connexion réussie
  private storeUserData(token: string, role: string, utilisateur: any): void {
    console.log('📥 Stockage du token, rôle et utilisateur dans le localStorage');

    if (token) localStorage.setItem('token', token);
    if (role) localStorage.setItem('role', role);
    if (utilisateur) {
      localStorage.setItem('utilisateur', JSON.stringify(utilisateur));
      if (utilisateur.email) {
        localStorage.setItem('email', utilisateur.email);
      }

      // Appel au service pour récupérer les informations du membre
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

  // Redirection après connexion en fonction du rôle
  private redirectBasedOnRole(role: string): void {
    const redirectUrl = this.router.url.includes('connexion') ? '/' : this.router.url; // Redirection conditionnelle
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

  // Gestion des erreurs de connexion
  private handleError(err: any): void {
    console.error('📛 Erreur de connexion détectée :', err);

    if (err.status === 401) {
      alert('Email ou mot de passe incorrect.');
    } else {
      alert('Une erreur est survenue. Veuillez réessayer plus tard.');
    }
  }

  // Validation de l'email avec une regex
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
