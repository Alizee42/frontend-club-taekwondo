import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { Router } from "@angular/router";

@Component({
  selector: 'app-profil',
  templateUrl: './profil.component.html',
  styleUrls: ['./profil.component.css'],
  standalone: true,
  imports: [FormsModule, CommonModule] // Supprimez Router des imports
})
export class ProfilComponent implements OnInit {
  user: any = {};
  apiUrl = '/api/utilisateurs';
  editMode: any = {};
  showPasswordModal = false; // Contrôle l'affichage de la modale
  passwordData = { newPassword: '', confirmPassword: '' }; // Données pour le mot de passe
  passwordError = ''; // Message d'erreur pour le mot de passe
  role: string | null = null; // Stocke le rôle de l'utilisateur

  constructor(private http: HttpClient, private router: Router) {} // Injectez Router ici

  ngOnInit(): void {
    const storedUser = localStorage.getItem('user');
    this.role = localStorage.getItem('role'); // Récupère le rôle de l'utilisateur depuis le localStorage
  
    if (!this.role) {
      console.error('Rôle non défini. Redirection vers la page de connexion.');
      this.logout(); // Déconnecte l'utilisateur si le rôle est absent
      return;
    }
  
    if (storedUser) {
      this.user = JSON.parse(storedUser); // Recharge les informations utilisateur depuis le localStorage
    } else {
      this.loadUserData(); // Charge les données depuis le backend si elles ne sont pas dans le localStorage
    }
  }

  logout(): void {
    localStorage.removeItem('token'); // Supprime le token
    localStorage.removeItem('user'); // Supprime les informations utilisateur
    localStorage.removeItem('role'); // Supprime le rôle
    this.role = null; // Réinitialise le rôle
    this.router.navigate(['/connexion']); // Redirige vers la page de connexion
  }

  loadUserData(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Utilisateur non authentifié.');
      return;
    }
  
    this.http.get<any>(`${this.apiUrl}/me`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (response) => {
        this.user = response;
        localStorage.setItem('user', JSON.stringify(this.user)); // Stocke les informations utilisateur
      },
      error: (err) => {
        console.error('Erreur lors de la récupération des données utilisateur :', err);
      }
    });
  }

  saveProfile(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Utilisateur non authentifié.');
      return;
    }

    this.http.put<any>(`${this.apiUrl}/me`, this.user, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: () => {
        alert('Profil mis à jour avec succès.');
        this.editMode = {};
      },
      error: (err) => {
        console.error('Erreur lors de la mise à jour du profil :', err);
        alert('Une erreur est survenue lors de la mise à jour du profil.');
      }
    });
  }

  openPasswordModal(): void {
    this.showPasswordModal = true;
    this.passwordData = { newPassword: '', confirmPassword: '' };
    this.passwordError = '';
  }

  closePasswordModal(): void {
    this.showPasswordModal = false;
  }

  updatePassword(): void {
    const { newPassword, confirmPassword } = this.passwordData;
  
    // Validation des mots de passe
    if (newPassword !== confirmPassword) {
      this.passwordError = 'Les mots de passe ne correspondent pas.';
      return;
    }
  
    if (!this.validatePassword(newPassword)) {
      this.passwordError =
        'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.';
      return;
    }
  
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Utilisateur non authentifié.');
      return;
    }
  
    this.http.put<any>(`${this.apiUrl}/me/password`, { password: newPassword }, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: () => {
        alert('Mot de passe mis à jour avec succès.');
        this.closePasswordModal();
      },
      error: (err) => {
        console.error('Erreur lors de la mise à jour du mot de passe :', err);
        alert('Une erreur est survenue lors de la mise à jour du mot de passe.');
      }
    });
  }

  validatePassword(password: string): boolean {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(password);
  }

  toggleEdit(field: string): void {
    this.editMode[field] = !this.editMode[field];
  }
  getInitiales(nom: string, prenom: string): string {
    const initialeNom = nom ? nom.charAt(0) : '';
    const initialePrenom = prenom ? prenom.charAt(0) : '';
    return (initialeNom + initialePrenom).toUpperCase();
  }
  
}