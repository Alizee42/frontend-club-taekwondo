import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';

import { Club, ClubService } from './services/club.service';
import { ClubSelectionService } from './services/club-selection.service';
import { AuthService } from './services/auth.service';
import { ToastContainerComponent } from './shared/toast/toast-container/toast-container.component';
import { FooterComponent } from './layout/footer/footer.component';
import { UniversalHeaderComponent } from './shared/layout/universal-header/universal-header.component';
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
  constructor(
    private clubService: ClubService,
    public auth: AuthService,
    private router: Router,
    private clubSelectionService: ClubSelectionService
  ) {
    // eslint-disable-next-line no-console
    console.log('[AppComponent] constructed');
  }

  get isAccueilRoute(): boolean {
    return window.location.pathname === '/';
  }

  get isDashboardRoute(): boolean {
    const url = this.router.url.split('?')[0];
    return ['/admin', '/super-admin', '/membre', '/parent'].some(p => url.startsWith(p));
  }

  showSelectClubModal = false;
  currentUser: any = null;
  selectedClub: Club | null = null;
  isUserLoggedIn = false;
  userName: string | undefined;
  userAvatar: string | undefined;
  unreadNotifications = 0;

  private clubSub?: any;
  private authSub?: any;
  private routerSub?: any;

  onChangeClub(): void {
    this.showSelectClubModal = true;
  }

  onClubSelected(club: Club): void {
    if (this.isUserLoggedIn) {
      const userClubId = this.currentUser?.['clubId'];
      if (userClubId && club.id !== userClubId) {
        alert('Veuillez selectionner le club associe a votre compte.');
        return;
      }
    }

    this.clubService.setSelectedClub(club);
    this.showSelectClubModal = false;
  }

  onLogout(): void {
    this.auth.logout();
    this.isUserLoggedIn = false;
    this.userName = undefined;
    this.userAvatar = undefined;
    this.unreadNotifications = 0;
    this.showSelectClubModal = false;
    this.router.navigate(['/']);
  }

  get role(): string {
    return this.auth.getRole() ?? '';
  }

  onGoToDashboard(): void {
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

  ngOnInit(): void {
    // eslint-disable-next-line no-console
    console.log('[AppComponent] ngOnInit start');

    this.clubSub = this.clubService.selectedClub$.subscribe(
      club => {
        this.selectedClub = club;
        // eslint-disable-next-line no-console
        console.log('[AppComponent] selectedClub$', club);
      },
      err => console.error('[AppComponent] clubService.selectedClub$ error', err)
    );

    const initial = this.clubService.getSelectedClub();
    if (initial && initial.id) {
      this.clubSelectionService.setSelectedClubId(initial.id);
    } else {
      // Le blocage plein ecran venait d'ici : on ne force plus la modale au demarrage.
      this.clubSelectionService.setSelectedClubId(null);
    }

    this.clubService.selectedClub$.subscribe(c => {
      this.clubSelectionService.setSelectedClubId(c?.id ?? null);
    });

    this.authSub = this.auth.authState$.subscribe(
      state => {
        this.isUserLoggedIn = state.isConnecte;
        this.currentUser = state.user;

        if (state.user) {
          this.userName = `${state.user.prenom ?? ''} ${state.user.nom ?? ''}`.trim();
          this.userAvatar = state.user['avatarUrl'] || '';
          this.unreadNotifications = state.user['unreadNotifications'] || 0;

          const selectedClub = this.clubService.getSelectedClub();
          const userRole = state.role ? state.role.toString().toUpperCase() : '';

          if (state.role && userRole === 'ADMIN') {
            if (!state.user['clubId']) {
              alert('Votre compte administrateur n est associe a aucun club. Veuillez contacter le support.');
              this.auth.logout();
              return;
            }

            const clubId = state.user['clubId'];
            if (!selectedClub) {
              this.clubService.getClubs().subscribe(clubs => {
                const club = clubs.find(c => c.id === clubId);
                if (club && state.user) {
                  this.clubService.setSelectedClub({
                    id: state.user['clubId'],
                    name: state.user['clubName'] || '',
                    nom: state.user['clubName'] || '',
                    ville: '',
                    logo: ''
                  });
                  this.showSelectClubModal = false;
                }
              });
            }
          }
        } else {
          this.userName = undefined;
          this.userAvatar = undefined;
          this.unreadNotifications = 0;
          this.showSelectClubModal = false;
        }
      },
      err => console.error('[AppComponent] auth.authState$ error', err)
    );

    this.routerSub = this.router.events.subscribe(
      event => {
        try {
          if (event instanceof NavigationEnd) {
            this.isUserLoggedIn = this.auth.isConnecte();
            this.currentUser = this.auth.getUtilisateurConnecte();
            this.userName = this.currentUser
              ? `${this.currentUser.prenom ?? ''} ${this.currentUser.nom ?? ''}`.trim()
              : undefined;
            this.userAvatar = this.currentUser ? this.currentUser['avatarUrl'] || '' : undefined;
            this.unreadNotifications = this.currentUser ? this.currentUser['unreadNotifications'] || 0 : 0;
            this.selectedClub = this.clubService.getSelectedClub();
          }
        } catch (e) {
          console.error('[AppComponent] router.events handler error', e);
        }
      },
      err => console.error('[AppComponent] router.events error', err)
    );

    // eslint-disable-next-line no-console
    console.log('[AppComponent] ngOnInit end');
  }

  ngOnDestroy(): void {
    if (this.clubSub) this.clubSub.unsubscribe();
    if (this.authSub) this.authSub.unsubscribe();
    if (this.routerSub) this.routerSub.unsubscribe();
  }
}
