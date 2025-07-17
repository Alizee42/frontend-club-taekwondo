import { Component } from '@angular/core';
import { RouterModule } from '@angular/router'; // Pour router-outlet

@Component({
  selector: 'app-membre-layout',
  templateUrl: './membre-layout.component.html',
  styleUrls: ['./membre-layout.component.css'],
  standalone: true, // Déclare le composant comme autonome
  imports: [
    RouterModule, // Pour router-outlet
  ]
})
export class MembreLayoutComponent {}