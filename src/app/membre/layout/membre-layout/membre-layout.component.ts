import { Component } from '@angular/core';
import { RouterModule } from '@angular/router'; // Pour router-outlet
import { MembreHeaderComponent } from '../membre-header/membre-header.component'; // Importer le header membre

@Component({
  selector: 'app-membre-layout',
  templateUrl: './membre-layout.component.html',
  styleUrls: ['./membre-layout.component.css'],
  standalone: true, // Déclare le composant comme autonome
  imports: [
    RouterModule, // Pour router-outlet
    MembreHeaderComponent // Ajout de MembreHeaderComponent
  ]
})
export class MembreLayoutComponent {}