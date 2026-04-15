import { Component, EventEmitter, HostListener, Input, OnChanges, Output } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

type RoleStr = 'ADMIN' | 'SUPER_ADMIN' | 'MEMBRE' | 'PARENT' | string;

@Component({
  selector: 'universal-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './universal-header.component.html',
  styleUrls: ['./universal-header.component.css']
})
export class UniversalHeaderComponent implements OnChanges {

  @Input() clubName: string = '';
  @Input() isUserLoggedIn: boolean = false;
  @Input() userName?: string;
  @Input() userAvatar?: string;
  @Input() unreadNotifications: number = 0;
  @Input() role: RoleStr = '';
  @Input() cartCount: number = 0;

  @Output() changeClub       = new EventEmitter<void>();
  @Output() logout            = new EventEmitter<void>();
  @Output() goToDashboard     = new EventEmitter<void>();
  @Output() goToProfile       = new EventEmitter<void>();
  @Output() openNotifications = new EventEmitter<void>();

  userDropdownOpen = false;
  notifOpen        = false;
  mobileOpen       = false;
  dashboardRoute   = '/dashboard';

  constructor(private router: Router) {}

  ngOnChanges(): void {
    const r = (this.role ?? '').toString().toUpperCase();
    if      (r === 'SUPER_ADMIN') { this.dashboardRoute = '/super-admin/dashboard-super-admin'; }
    else if (r === 'ADMIN')       { this.dashboardRoute = '/admin/dashboard-admin'; }
    else if (r === 'PARENT')      { this.dashboardRoute = '/parent/dashboard-parent'; }
    else if (r === 'MEMBRE')      { this.dashboardRoute = '/membre/dashboard-membre'; }
    else                          { this.dashboardRoute = '/dashboard'; }
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.userDropdownOpen = false;
    this.notifOpen = false;
  }

  closeAll(): void {
    this.userDropdownOpen = false;
    this.notifOpen = false;
    this.mobileOpen = false;
  }

  toggleUserDropdown(): void {
    this.userDropdownOpen = !this.userDropdownOpen;
    if (this.userDropdownOpen) { this.notifOpen = false; }
  }

  toggleNotif(): void {
    this.notifOpen = !this.notifOpen;
    if (this.notifOpen) { this.userDropdownOpen = false; }
  }

  toggleMobile(): void {
    this.mobileOpen = !this.mobileOpen;
    if (this.mobileOpen) {
      this.userDropdownOpen = false;
      this.notifOpen = false;
    }
  }

  closeUserDropdown(): void { this.userDropdownOpen = false; }

  getUserInitials(): string {
    const name = this.userName ?? '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) { return (parts[0][0] + parts[1][0]).toUpperCase(); }
    if (parts.length === 1) { return parts[0].substring(0, 2).toUpperCase(); }
    return 'U';
  }

  getUserName(): string { return this.userName ?? ''; }

  goToProfil(): void { this.router.navigate(['/profil']); }

  handleLogout(): void { this.logout.emit(); }
}
