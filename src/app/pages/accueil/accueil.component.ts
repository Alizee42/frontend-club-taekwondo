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
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';
import { UniversalHeaderComponent } from '../../shared/layout/universal-header/universal-header.component';

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
  UiButtonComponent,
  UniversalHeaderComponent
  ],
  templateUrl: './accueil.component.html',
  styleUrls: ['./accueil.component.css']
})
export class AccueilComponent {
  showClubModal = true;

  // Pour le header universel
  isUserLoggedIn = false; // À remplacer par la vraie logique d'authentification
  userName: string | undefined = undefined;
  userAvatar: string | undefined = undefined;
  unreadNotifications = 0;

  constructor(private clubService: ClubService) {
    this.showClubModal = !this.clubService.getSelectedClub();
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
    // Ajoute ici la navigation vers le dashboard
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