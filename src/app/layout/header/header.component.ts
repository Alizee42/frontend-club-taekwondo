import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  menuOpen = false;
  dropdownOpenInfos = false;
  dropdownOpenClub = false;

  constructor(private router: Router) {}

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  toggleDropdown(menu: string) {
    if (menu === 'infos') {
      this.dropdownOpenInfos = !this.dropdownOpenInfos;
      this.dropdownOpenClub = false;
    } else if (menu === 'club') {
      this.dropdownOpenClub = !this.dropdownOpenClub;
      this.dropdownOpenInfos = false;
    }
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
  closeMenu() {
    this.menuOpen = false;
    this.dropdownOpenInfos = false;
    this.dropdownOpenClub = false;
  }

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.main-nav') && !target.closest('.burger')) {
      this.closeMenu();
    }
  }
}
