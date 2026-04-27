import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from "@angular/router";
import { environment } from '../../../environments/environment';
import { AuthService, Utilisateur } from '../../services/auth.service';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';

@Component({
  selector: 'app-profil',
  templateUrl: './profil.component.html',
  styleUrls: ['./profil.component.css'],
  standalone: true,
  imports: [FormsModule, CommonModule, UiButtonComponent] // Supprimez Router des imports
})
export class ProfilComponent implements OnInit {
  user: Utilisateur | any = {};
  apiUrl = `${environment.apiUrl}/utilisateurs`;
  editMode: any = {};
  activeTab = 'informations'; // Onglet actif par défaut
  showPasswordModal = false; // Contrôle l'affichage de la modale
  passwordData = { currentPassword: '', newPassword: '', confirmPassword: '' }; // Données pour le mot de passe
  passwordError = ''; // Message d'erreur pour le mot de passe
  role: string | null = null; // Stocke le rôle de l'utilisateur
  // Feedback UI
  saveSuccess = '';
  saveError = '';
  pwdSuccess = '';
  pwdError = '';
  // Edition
  isEditing = false;
  private originalUser: Utilisateur | any = null;
  // Sécurité - affichage
  lastPwdAgo = '';
  lastPwdExact = '';

  constructor(private http: HttpClient, private router: Router, private auth: AuthService) {}

  ngOnInit(): void {
    // Rôle courant via AuthService
    this.role = this.auth.getRole() ? String(this.auth.getRole()) : null;
    if (!this.auth.isConnecte()) {
      this.logout();
      return;
    }

    // Pré-charger depuis état courant si dispo
    const authUser = this.auth.getUtilisateurConnecte();
    if (authUser) {
      this.user = { ...authUser };
    }
    // Toujours rafraîchir depuis le backend pour avoir les derniers champs (nom/prenom parent, etc.)
    this.loadUserData();
    
  }

  logout(): void {
    this.auth.logout();
    this.role = null;
    this.router.navigate(['/connexion']);
  }

  // Méthode pour changer d'onglet
  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  // Méthode pour activer/désactiver les notifications email
  // (préférences/notifications email supprimées)

  loadUserData(): void {
    const headers = this.auth.getAuthHeaders();
    this.http.get<any>(`${this.apiUrl}/me`, { headers }).subscribe({
      next: (response) => {
        this.user = response;
        // Mettez à jour les deux clés pour compatibilité
        try {
          this.auth.updateUtilisateurConnecte(this.user);
        } catch {}
        this.updateLastPwdAgo();
      },
      error: (err) => {
        console.error('Erreur lors de la récupération des données utilisateur :', err);
      }
    });
  }

  saveProfile(): void {
    this.saveSuccess = '';
    this.saveError = '';
    const current = this.user as any;
    const id = current?.id;
    if (!id) {
      this.saveError = 'Impossible de mettre à jour: identifiant manquant.';
      return;
    }
    // Construire un DTO complet pour éviter d’écraser avec des null
    const dto: any = {
      id,
      nom: current.nom ?? '',
      prenom: current.prenom ?? '',
      email: current.email ?? '',
      telephone: current.telephone ?? current.tel ?? '',
      adresse: current.adresse ?? '',
      dateNaissance: current.dateNaissance ?? null,
      role: current.role ?? null,
      clubId: current.clubId ?? null
    };

    const headers = this.auth.getAuthHeaders();
    this.http.put<any>(`${this.apiUrl}/${id}`, dto, { headers }).subscribe({
      next: (updated) => {
        this.user = updated || dto;
        try {
          this.auth.updateUtilisateurConnecte(this.user);
        } catch {}
        this.editMode = {};
        this.saveSuccess = 'Profil mis à jour avec succès.';
        this.isEditing = false;
        this.originalUser = null;
        this.updateLastPwdAgo();
      },
      error: (err) => {
        console.error('Erreur lors de la mise à jour du profil :', err);
        this.saveError = "Une erreur est survenue lors de la mise à jour du profil.";
      }
    });
  }

  openPasswordModal(): void {
    this.showPasswordModal = true;
    this.passwordData = { currentPassword: '', newPassword: '', confirmPassword: '' };
    this.passwordError = '';
    this.pwdSuccess = '';
    this.pwdError = '';
  }

  closePasswordModal(): void {
    this.showPasswordModal = false;
  }

  updatePassword(): void {
    const { newPassword, confirmPassword } = this.passwordData;

    this.pwdSuccess = '';
    this.pwdError = '';

    if (newPassword !== confirmPassword) {
      this.passwordError = 'Les mots de passe ne correspondent pas.';
      return;
    }

    if (!this.validatePassword(newPassword)) {
      this.passwordError =
        'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.';
      return;
    }

    const id = (this.user as any)?.id;
    if (!id) {
      this.pwdError = 'Impossible de mettre à jour le mot de passe: identifiant manquant.';
      return;
    }

    // On envoie un DTO complet + password (service encodera et mettra passwordTemporaire=false)
    const current = this.user as any;
    const dto: any = {
      id,
      nom: current.nom ?? '',
      prenom: current.prenom ?? '',
      email: current.email ?? '',
      telephone: current.telephone ?? current.tel ?? '',
      adresse: current.adresse ?? '',
      dateNaissance: current.dateNaissance ?? null,
      role: current.role ?? null,
      clubId: current.clubId ?? null,
      password: newPassword
    };

    const headers = this.auth.getAuthHeaders();
    this.http.put<any>(`${this.apiUrl}/${id}`, dto, { headers }).subscribe({
      next: (updated) => {
        this.user = updated || dto;
        try {
          this.auth.updateUtilisateurConnecte(this.user);
        } catch {}
        this.pwdSuccess = 'Mot de passe mis à jour avec succès.';
        this.passwordError = '';
        this.closePasswordModal();
        this.updateLastPwdAgo();
      },
      error: (err) => {
        console.error('Erreur lors de la mise à jour du mot de passe :', err);
        this.pwdError = 'Une erreur est survenue lors de la mise à jour du mot de passe.';
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
  startEdit(): void {
    // Deep clone simple
    this.originalUser = JSON.parse(JSON.stringify(this.user || {}));
    this.isEditing = true;
    this.saveSuccess = '';
    this.saveError = '';
  }

  private updateLastPwdAgo(): void {
    const ts: any = (this.user as any)?.passwordUpdatedAt;
    if (!ts) {
      this.lastPwdAgo = '';
      this.lastPwdExact = '';
      return;
    }
    try {
      const d = new Date(ts);
      const now = new Date();
      this.lastPwdExact = d.toLocaleString();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays >= 1) {
        this.lastPwdAgo = `il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
      } else {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHours >= 1) {
          this.lastPwdAgo = `il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
        } else {
          const diffMin = Math.floor(diffMs / (1000 * 60));
          this.lastPwdAgo = diffMin <= 1 ? "à l'instant" : `il y a ${diffMin} minutes`;
        }
      }
    } catch {
      this.lastPwdAgo = '';
    }
  }

  cancelEdit(): void {
    if (this.originalUser) {
      this.user = JSON.parse(JSON.stringify(this.originalUser));
    }
    this.isEditing = false;
    this.originalUser = null;
    this.saveError = '';
  }
  getInitiales(nom: string, prenom: string): string {
    const initialeNom = nom ? nom.charAt(0) : '';
    const initialePrenom = prenom ? prenom.charAt(0) : '';
    return (initialeNom + initialePrenom).toUpperCase();
  }
  
}
