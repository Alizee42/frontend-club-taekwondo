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
  panierOpen = false;

  isLoggedIn = false;
  user: any = null;
  panier: any[] = [];
  cartCount = 0;

  constructor(private router: Router) {}

  ngOnInit() {
    this.checkLoginStatus();
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      this.user = JSON.parse(storedUser);
    }

    const storedPanier = localStorage.getItem('panier');
    if (storedPanier) {
      this.panier = JSON.parse(storedPanier);
      this.cartCount = this.panier.length;
    }
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

  togglePanier() {
    this.panierOpen = !this.panierOpen;
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
    this.router.navigate(['/profil']);
  }

  goToDashboard() {
    const role = localStorage.getItem('role')?.toLowerCase();
    if (role === 'admin') {
      this.router.navigate(['/admin/dashboard-admin']);
    } else if (role === 'membre') {
      this.router.navigate(['/membre/dashboard-membre']);
    } else {
      console.error('Rôle inconnu ou non défini.');
      alert('Votre rôle est inconnu. Veuillez contacter l’administrateur.');
      this.router.navigate(['/']);
    }
  }

  goToBoutique() {
    this.router.navigate(['/boutique']);
    this.closeMenu();
  }

  goToPanier() {
    this.panierOpen = !this.panierOpen;
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('panier');
    this.isLoggedIn = false;
    this.router.navigate(['/connexion']);
  }

  getInitials(): string {
    if (!this.user || !this.user.nom || !this.user.prenom) return '?';
    return (this.user.prenom.charAt(0) + this.user.nom.charAt(0)).toUpperCase();
  }

  checkLoginStatus() {
    const token = localStorage.getItem('token');
    this.isLoggedIn = !!token;
  }

  closeMenu() {
    this.menuOpen = false;
    this.dropdownOpenClub = false;
    this.profileMenuOpen = false;
    this.panierOpen = false;
  }
  scrollToSection(sectionId: string) {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.closeMenu(); // facultatif : referme le menu mobile après clic
    }
  }
  
  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (
      !target.closest('.main-nav') &&
      !target.closest('.burger') &&
      !target.closest('.profile-menu') &&
      !target.closest('.cart-icon') &&
      !target.closest('.cart-preview')
    ) {
      this.closeMenu();
    }
  }
}
