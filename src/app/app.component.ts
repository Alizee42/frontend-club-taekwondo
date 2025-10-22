import { Component, OnInit, Renderer2, OnDestroy } from '@angular/core';
import { ClubService, Club } from './services/club.service';
import { AuthService } from './services/auth.service';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { ToastContainerComponent } from './shared/toast/toast-container/toast-container.component'; // <-- AJOUT



import { HeaderComponent } from './layout/header/header.component';
import { ConnectedHeaderComponent } from './components/shared/connected-header/connected-header.component';
import { FooterComponent } from './layout/footer/footer.component';
import { UniversalHeaderComponent } from './shared/layout/universal-header/universal-header.component';

import { ParametresPaiementService } from './services/parametres-paiement.service';
import { ClubSelectComponent } from './club-select/club-select.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
  CommonModule,
  RouterModule,
  UniversalHeaderComponent,
  FooterComponent,
  ToastContainerComponent,
  ClubSelectComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  showSelectClubModal = false;

  onChangeClub() {
    this.showSelectClubModal = true;
  }

  currentUser: any = null;

  onClubSelected(club: Club) {
    // Vérification : l'utilisateur doit choisir le club associé à son compte
    const userClubId = this.currentUser?.['clubId'];
    if (userClubId && club.id !== userClubId) {
      alert('Veuillez sélectionner le club associé à votre compte.');
      return;
    }
    this.clubService.setSelectedClub(club);
    this.showSelectClubModal = false;
  }
  onLogout() {
    this.auth.logout();
    this.isUserLoggedIn = false;
    this.userName = undefined;
    this.userAvatar = undefined;
    this.unreadNotifications = 0;
    // Redirection vers l'accueil
    window.location.href = '/';
  }
  selectedClub: Club | null = null;
  isUserLoggedIn = false;
  userName: string | undefined;
  userAvatar: string | undefined;
  unreadNotifications = 0;
  private clubSub?: any;
  private authSub?: any;

  constructor(private clubService: ClubService, public auth: AuthService) {}

  get role(): string {
    return this.auth.getRole() ?? '';
  }

  ngOnInit() {
    this.clubSub = this.clubService.selectedClub$.subscribe(club => {
      this.selectedClub = club;
    });
    this.authSub = this.auth.authState$.subscribe(state => {
      this.isUserLoggedIn = state.isConnecte;
      this.currentUser = state.user;
      if (state.user) {
        this.userName = `${state.user.prenom ?? ''} ${state.user.nom ?? ''}`.trim();
        this.userAvatar = state.user['avatarUrl'] || '';
        this.unreadNotifications = state.user['unreadNotifications'] || 0;
        // Si aucun club sélectionné, ouvrir la modale premium
        const selectedClub = this.clubService.getSelectedClub();
        if (!selectedClub) {
          this.showSelectClubModal = true;
        }
        // Si admin connecté, forcer le club sélectionné
        if (state.role && state.role.toString().toUpperCase() === 'ADMIN') {
          if (!state.user['clubId']) {
            alert('Votre compte administrateur n’est associé à aucun club. Veuillez contacter le support.');
            this.auth.logout();
            return;
          }
          const clubId = state.user['clubId'];
          if (!selectedClub) {
            this.clubService.getClubs().subscribe(clubs => {
              const club = clubs.find(c => c.id === clubId);
              if (club) {
                if (state.user) {
                  this.clubService.setSelectedClub({
                    id: state.user['clubId'],
                    name: state.user['clubName'] || '',
                    nom: state.user['clubName'] || '',
                    ville: '',
                    logo: ''
                  });
                  this.showSelectClubModal = false;
                }
              }
            });
          }
        }
      } else {
        this.userName = undefined;
        this.userAvatar = undefined;
        this.unreadNotifications = 0;
      }
    });
  }

  ngOnDestroy() {
    if (this.clubSub) this.clubSub.unsubscribe();
    if (this.authSub) this.authSub.unsubscribe();
  }

}
