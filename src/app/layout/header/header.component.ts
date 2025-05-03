import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  menuOpen = false;
  dropdownOpenClub = false;
  profileMenuOpen = false;
  isLoggedIn = false; // État de connexion de l'utilisateur

  constructor(private router: Router) {}

  ngOnInit() {
    this.checkLoginStatus();
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  toggleDropdown(menu: string) {
    if (menu === 'club') {
      this.dropdownOpenClub = !this.dropdownOpenClub;
    }
  }

  toggleProfileMenu() {
    this.profileMenuOpen = !this.profileMenuOpen;
  }

  scrollToSection(sectionId: string) {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.closeMenu();
    }
  }

  goToInscription() {
    this.router.navigate(['/inscription']);
    this.closeMenu();
  }

  goHome() {
    this.router.navigate(['/']);
    this.closeMenu();
  }

  goToGalerie() {
    this.router.navigate(['/galerie']);
    this.closeMenu();
  }

  goToContact() {
    this.router.navigate(['/contact']);
    this.closeMenu();
  }

  goToConnexion() {
    this.router.navigate(['/connexion']);
    this.closeMenu();
  }
  goToProfil() {
    this.router.navigate(['/profil']); // Redirige vers la page "Modifier mon profil"
  }

  goToDashboard() {
    this.router.navigate(['/admin/dashboard-admin']); // Redirige vers le tableau de bord admin
  }

  logout() {
    localStorage.removeItem('token'); // Supprime le token
    localStorage.removeItem('user'); // Supprime les informations utilisateur
    this.isLoggedIn = false; // Met à jour l'état de connexion
    this.router.navigate(['/connexion']); // Redirige vers la page de connexion
  }

  getInitials(): string {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user && user.name) {
      const names = user.name.split(' ');
      const initials = names.map((n: string) => n[0]).join('');
      return initials.toUpperCase();
    }
    return 'U';
  }

  checkLoginStatus() {
    const token = localStorage.getItem('token'); // Vérifie si un token est présent
    this.isLoggedIn = !!token; // Si un token existe, l'utilisateur est connecté
  }

  closeMenu() {
    this.menuOpen = false;
    this.dropdownOpenClub = false;
    this.profileMenuOpen = false;
  }

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.main-nav') && !target.closest('.burger') && !target.closest('.profile-menu')) {
      this.closeMenu();
    }
  }
}