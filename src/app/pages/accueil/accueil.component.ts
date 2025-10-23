import { Component } from '@angular/core';
import { Club } from '../../services/club.service';
import { ClubService } from '../../services/club.service';
import { CommonModule } from '@angular/common';
import { AProposComponent } from '../accueil/a-propos/a-propos.component';
import { AvisComponent } from '../accueil/avis/avis.component';
import { HorairesComponent } from '../accueil/horaires/horaires.component';
import { ProfesseursComponent } from '../accueil/professeurs/professeurs.component';
import { ActualitesComponent } from '../accueil/actualites/actualites.component'; 
import { BanniereComponent } from '../accueil/banniere/banniere.component';
import { ClubSelectComponent } from '../../club-select/club-select.component';
import { UniversalHeaderComponent } from '../../shared/layout/universal-header/universal-header.component';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-accueil',
  standalone: true,
  imports: [
    CommonModule,
    BanniereComponent,
    AProposComponent,
    AvisComponent,
    HorairesComponent,
    ProfesseursComponent,
    ActualitesComponent,
    ClubSelectComponent,
  UniversalHeaderComponent
  ],
  templateUrl: './accueil.component.html',
  styleUrls: ['./accueil.component.css']
})
export class AccueilComponent {
  showClubModal = true;

  isUserLoggedIn = false;
  userName: string | undefined = undefined;
  userAvatar: string | undefined = undefined;
  unreadNotifications = 0;

  constructor(private clubService: ClubService, private authService: AuthService, private router: Router) {
    this.showClubModal = !this.clubService.getSelectedClub();
    // Synchronise les infos utilisateur avec AuthService
    this.authService.authState$.subscribe(state => {
      this.isUserLoggedIn = state.isConnecte;
      this.userName = state.user ? `${state.user['prenom'] ?? ''} ${state.user['nom'] ?? ''}`.trim() : undefined;
      this.userAvatar = state.user ? state.user['avatarUrl'] : undefined;
      this.unreadNotifications = state.user ? state.user['unreadNotifications'] || 0 : 0;
    });
  }

  ouvrirModaleClub() {
    this.showClubModal = true;
  }

  get selectedClub(): Club | null {
    return this.clubService.getSelectedClub();
  }

  closeModal() {
    this.showClubModal = false;
  }

  onClubSelected(club: Club) {
    this.clubService.setSelectedClub(club);
    this.showClubModal = false;
    // Optionnel : recharger les actualités ou rediriger
  }

  // Méthodes pour le header universel
  onChangeClub() {
    this.showClubModal = true;
  }
  onLogout() {
    this.isUserLoggedIn = false;
    this.userName = undefined;
    this.userAvatar = undefined;
    // Ajoute ici la logique de déconnexion réelle
  }
  onGoToDashboard() {
    if (this.isUserLoggedIn) {
      let role = '';
      if (this.authService && this.authService['authState$']) {
        const state = (this as any).authService._authState$.getValue();
        role = state.role ? state.role.toString().toUpperCase() : '';
      }
      let route = '/dashboard';
      switch (role) {
        case 'SUPER_ADMIN':
          route = '/super-admin/dashboard-super-admin';
          break;
        case 'ADMIN':
          route = '/admin/dashboard-admin';
          break;
        case 'PARENT':
          route = '/parent/dashboard-parent';
          break;
        case 'MEMBRE':
          route = '/membre/dashboard-membre';
          break;
      }
      this.router.navigate([route]);
    }
  }
  onGoToProfile() {
    // Ajoute ici la navigation vers le profil
  }
  onOpenNotifications() {
    // Ajoute ici l'ouverture des notifications
  }
  // Simule un utilisateur connecté pour test
  simulateLogin() {
    this.isUserLoggedIn = true;
    this.userName = 'Jean Dupont';
    this.userAvatar = '/assets/images/avatar-test.png';
    this.unreadNotifications = 3;
  }
}