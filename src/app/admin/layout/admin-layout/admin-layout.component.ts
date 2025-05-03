import { Component } from '@angular/core';
import { RouterModule } from '@angular/router'; // Pour router-outlet
import { AdminHeaderComponent } from '../admin-header/admin-header.component'; // Importer le header admin

@Component({
  selector: 'app-admin-layout',
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.css'],
  standalone: true, // Déclare le composant comme autonome
  imports: [
    RouterModule, // Pour router-outlet
    AdminHeaderComponent, // Ajout de AdminHeaderComponent
  ]
})
export class AdminLayoutComponent {}