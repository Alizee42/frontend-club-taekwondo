import { Component } from '@angular/core';
import { RouterModule } from '@angular/router'; // Pour router-outlet

@Component({
  selector: 'app-admin-layout',
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.css'],
  standalone: true, // Déclare le composant comme autonome
  imports: [
    RouterModule, // Pour router-outlet
  ]
})
export class AdminLayoutComponent {}