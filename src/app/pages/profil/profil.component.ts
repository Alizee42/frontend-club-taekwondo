import { Component, OnInit, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService, Utilisateur } from '../../services/auth.service';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  selector: 'app-profil',
  templateUrl: './profil.component.html',
  styleUrls: ['./profil.component.css'],
  standalone: true,
  imports: [FormsModule, CommonModule, UiButtonComponent]
})
export class ProfilComponent implements OnInit {
  user: Utilisateur | any = {};
  apiUrl = `${environment.apiUrl}/utilisateurs`;
  editMode: any = {};
  activeTab = 'informations';
  showPasswordModal = false;
  passwordData = { currentPassword: '', newPassword: '', confirmPassword: '' };
  passwordError = '';
  role: string | null = null;
  // Edition
  isEditing = false;
  isSaving = false;
  isSavingPassword = false;
  private originalUser: Utilisateur | any = null;
  // Securite - affichage
  lastPwdAgo = '';
  lastPwdExact = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private auth: AuthService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.role = this.auth.getRole() ? String(this.auth.getRole()) : null;
    if (!this.auth.isConnecte()) {
      this.logout();
      return;
    }
    const authUser = this.auth.getUtilisateurConnecte();
    if (authUser) {
      this.user = { ...authUser };
    }
    this.loadUserData();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.isEditing) {
      event.preventDefault();
    }
  }

  logout(): void {
    this.auth.logout();
    this.role = null;
    this.router.navigate(['/connexion']);
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  loadUserData(): void {
    const headers = this.auth.getAuthHeaders();
    this.http.get<any>(`${this.apiUrl}/me`, { headers }).subscribe({
      next: (response) => {
        this.user = response;
        try { this.auth.updateUtilisateurConnecte(this.user); } catch {}
        this.updateLastPwdAgo();
      },
      error: (err) => {
        console.error('Erreur chargement profil :', err);
      }
    });
  }

  saveProfile(): void {
    const current = this.user as any;
    const id = current?.id;
    if (!id) {
      this.toast.error('Identifiant manquant, impossible de sauvegarder.');
      return;
    }
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

    this.isSaving = true;
    const headers = this.auth.getAuthHeaders();
    this.http.put<any>(`${this.apiUrl}/${id}`, dto, { headers }).subscribe({
      next: (updated) => {
        this.user = updated || dto;
        try { this.auth.updateUtilisateurConnecte(this.user); } catch {}
        this.editMode = {};
        this.toast.success('Profil mis a jour avec succes.');
        this.isEditing = false;
        this.originalUser = null;
        this.isSaving = false;
        this.updateLastPwdAgo();
      },
      error: (err) => {
        console.error('Erreur mise a jour profil :', err);
        this.toast.error('Erreur lors de la mise a jour du profil.');
        this.isSaving = false;
      }
    });
  }

  openPasswordModal(): void {
    this.showPasswordModal = true;
    this.passwordData = { currentPassword: '', newPassword: '', confirmPassword: '' };
    this.passwordError = '';
  }

  get pwdStrength(): number {
    const v = this.passwordData.newPassword;
    if (!v) return 0;
    let s = 0;
    if (v.length >= 8) s++;
    if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
    if (/\d/.test(v)) s++;
    if (/[^A-Za-z0-9]/.test(v)) s++;
    return s;
  }

  get pwdStrengthClass(): string {
    const s = this.pwdStrength;
    return s > 0 ? `strength-${s}` : '';
  }

  get pwdStrengthLabel(): string {
    return ['', 'Faible', 'Correct', 'Bon', 'Fort'][this.pwdStrength] || '';
  }

  closePasswordModal(): void {
    this.showPasswordModal = false;
  }

  updatePassword(): void {
    const { newPassword, confirmPassword } = this.passwordData;

    if (newPassword !== confirmPassword) {
      this.passwordError = 'Les mots de passe ne correspondent pas.';
      return;
    }

    if (!this.validatePassword(newPassword)) {
      this.passwordError = 'Minimum 8 caracteres, une majuscule, une minuscule, un chiffre et un caractere special.';
      return;
    }

    const id = (this.user as any)?.id;
    if (!id) {
      this.toast.error('Identifiant manquant, impossible de mettre a jour le mot de passe.');
      return;
    }

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

    this.isSavingPassword = true;
    const headers = this.auth.getAuthHeaders();
    this.http.put<any>(`${this.apiUrl}/${id}`, dto, { headers }).subscribe({
      next: (updated) => {
        this.user = updated || dto;
        try { this.auth.updateUtilisateurConnecte(this.user); } catch {}
        this.toast.success('Mot de passe mis a jour avec succes.');
        this.passwordError = '';
        this.isSavingPassword = false;
        this.closePasswordModal();
        this.updateLastPwdAgo();
      },
      error: (err) => {
        console.error('Erreur mise a jour mot de passe :', err);
        this.toast.error('Erreur lors de la mise a jour du mot de passe.');
        this.isSavingPassword = false;
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
    this.originalUser = JSON.parse(JSON.stringify(this.user || {}));
    this.isEditing = true;
  }

  cancelEdit(): void {
    if (this.originalUser) {
      this.user = JSON.parse(JSON.stringify(this.originalUser));
    }
    this.isEditing = false;
    this.originalUser = null;
  }

  getInitiales(nom: string, prenom: string): string {
    const initialeNom = nom ? nom.charAt(0) : '';
    const initialePrenom = prenom ? prenom.charAt(0) : '';
    return (initialeNom + initialePrenom).toUpperCase();
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
          this.lastPwdAgo = diffMin <= 1 ? 'instant' : `il y a ${diffMin} minutes`;
        }
      }
    } catch {
      this.lastPwdAgo = '';
    }
  }
}
