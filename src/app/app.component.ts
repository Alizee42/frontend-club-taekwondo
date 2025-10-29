import { Component, OnInit, Renderer2, OnDestroy } from '@angular/core';
import { ClubService, Club } from './services/club.service';
import { ClubSelectionService } from './services/club-selection.service';
import { AuthService } from './services/auth.service';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { ToastContainerComponent } from './shared/toast/toast-container/toast-container.component'; // <-- AJOUT


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
  get isAccueilRoute(): boolean {
    return window.location.pathname === '/';
  }
  showSelectClubModal = false;

  onChangeClub() {
    // N'ouvre pas la modale si l'utilisateur est SUPER_ADMIN
    const role = this.role ? this.role.toString().toUpperCase() : '';
    if (role === 'SUPER_ADMIN') return;
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
  private routerSub?: any;

  constructor(private clubService: ClubService, public auth: AuthService, private router: Router,
              private clubSelectionService: ClubSelectionService) {}

  get role(): string {
    return this.auth.getRole() ?? '';
  }

  onGoToDashboard() {
    // Navigation vers le dashboard selon le rôle
    const role = this.role.toString().toUpperCase();
    if (role === 'ADMIN') {
      this.router.navigate(['/admin/dashboard-admin']);
    } else if (role === 'SUPER_ADMIN') {
      this.router.navigate(['/super-admin/dashboard-super-admin']);
    } else if (role === 'MEMBRE') {
      this.router.navigate(['/membre/dashboard-membre']);
    } else if (role === 'PARENT') {
      this.router.navigate(['/parent/dashboard-parent']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  ngOnInit() {
    this.clubSub = this.clubService.selectedClub$.subscribe(club => {
      this.selectedClub = club;
    });
    // Propager la sélection du ClubService vers ClubSelectionService (pour les components qui
    // écoutent uniquement l'ID via ClubSelectionService)
    const initial = this.clubService.getSelectedClub();
    if (initial && initial.id) {
      this.clubSelectionService.setSelectedClubId(initial.id);
    }
    this.clubService.selectedClub$.subscribe(c => {
      this.clubSelectionService.setSelectedClubId(c?.id ?? null);
    });
    this.authSub = this.auth.authState$.subscribe(state => {
      this.isUserLoggedIn = state.isConnecte;
      this.currentUser = state.user;
      if (state.user) {
        this.userName = `${state.user.prenom ?? ''} ${state.user.nom ?? ''}`.trim();
        this.userAvatar = state.user['avatarUrl'] || '';
        this.unreadNotifications = state.user['unreadNotifications'] || 0;
        const selectedClub = this.clubService.getSelectedClub();
        const userRole = state.role ? state.role.toString().toUpperCase() : '';
        // Affiche la modale seulement si aucun club sélectionné ET si l'utilisateur n'est pas SUPER_ADMIN
        if (!selectedClub && userRole !== 'SUPER_ADMIN') {
          this.showSelectClubModal = true;
        }
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

    // Ajout : souscription au router pour forcer la mise à jour du header à chaque navigation
    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        // Met à jour les inputs du header
        this.isUserLoggedIn = this.auth.isConnecte();
        this.currentUser = this.auth.getUtilisateurConnecte();
        this.userName = this.currentUser ? `${this.currentUser.prenom ?? ''} ${this.currentUser.nom ?? ''}`.trim() : undefined;
        this.userAvatar = this.currentUser ? this.currentUser['avatarUrl'] || '' : undefined;
        this.unreadNotifications = this.currentUser ? this.currentUser['unreadNotifications'] || 0 : 0;
        this.selectedClub = this.clubService.getSelectedClub();
      }
    });
  }

  ngOnDestroy() {
    if (this.clubSub) this.clubSub.unsubscribe();
    if (this.authSub) this.authSub.unsubscribe();
    if (this.routerSub) this.routerSub.unsubscribe();
  }

}
