import { Component } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  menuOpen: boolean = false; 
  dropdownOpen: boolean = false; 

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen; 
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation(); 
    this.dropdownOpen = !this.dropdownOpen; 
  }
}