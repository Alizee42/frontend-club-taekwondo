import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'universal-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './universal-header.component.html',
  styleUrls: ['./universal-header.component.css']
})
export class UniversalHeaderComponent {
  userDropdownOpen = false;
  showNotifications: boolean = true;
  // Zone courante (déduite de l'URL)
  isDashboardPage = false;
  isParentArea = false;
  isMembreArea = false;
  isProfilePage = false;

  toggleUserDropdown() {
    this.userDropdownOpen = !this.userDropdownOpen;
  }

  closeUserDropdown() {
    this.userDropdownOpen = false;
  }

  getUserInitials(): string {
    if (this.userName) {
      const parts = this.userName.split(' ');
      return (parts[0]?.charAt(0) ?? '') + (parts[1]?.charAt(0) ?? '');
    }
    return '';
  }

  getUserName(): string {
    return this.userName ?? '';
  }

  goToSpecializedDashboard() {
    this.goToDashboard.emit();
  }

  goToProfil() {
    this.router.navigate(['/profil']);
  }

  handleLogout() {
    this.logout.emit();
  }
  @Input() cartCount: number = 0;
  dashboardRoute: string = '/dashboard';
  @Input() role: string = '';

  ngOnChanges() {
    if (this.isUserLoggedIn && this.role) {
      const role = this.role.trim().toUpperCase();
      if (role === 'SUPER_ADMIN') {
        this.dashboardRoute = '/super-admin/dashboard-super-admin';
      } else if (role === 'ADMIN') {
        this.dashboardRoute = '/admin/dashboard-admin';
      } else if (role === 'PARENT') {
        this.dashboardRoute = '/parent/dashboard-parent';
      } else if (role === 'MEMBRE') {
        this.dashboardRoute = '/membre/dashboard-membre';
      } else {
        this.dashboardRoute = '/dashboard';
      }
    } else {
      this.dashboardRoute = '/dashboard';
    }
  }
  constructor(private router: Router) {
    this.router.events.subscribe(() => {
      const url = this.router.url || '';
      // Pages tableau de bord (tous rôles)
      // Garder l'affichage 'dashboard' pour les routes qui commencent par les préfixes admin/super-admin
      this.isDashboardPage = url.startsWith('/super-admin') || url.startsWith('/admin') || /\b(dashboard|dashboard-admin|dashboard-super-admin|dashboard-parent|dashboard-membre)\b/.test(url);
      // Zone Parent: toutes les routes qui commencent par /parent
      this.isParentArea = url.startsWith('/parent');
      // Zone Membre: toutes les routes qui commencent par /membre
      this.isMembreArea = url.startsWith('/membre');
      // Page Profil
      this.isProfilePage = url.startsWith('/profil');
    });
  }
  showDropdown = false;
  @Input() clubName: string = '';
  @Input() logoUrl: string = '';
  @Input() isUserLoggedIn: boolean = false;
  @Input() userName?: string;
  @Input() userAvatar?: string;
  @Input() unreadNotifications: number = 0;

  @Output() changeClub = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();
  @Output() goToDashboard = new EventEmitter<void>();
  @Output() goToProfile = new EventEmitter<void>();
  @Output() openNotifications = new EventEmitter<void>();
}
