import { Component } from '@angular/core';
import { RouterModule } from '@angular/router'; // Pour router-outlet
import { MembreHeaderComponent } from '../membre-header/membre-header.component'; // Importer le header membre
import { MembreFooterComponent } from '../membre-footer/membre-footer.component'; // Importer le footer membre

@Component({
  selector: 'app-membre-layout',
  templateUrl: './membre-layout.component.html',
  styleUrls: ['./membre-layout.component.css'],
  standalone: true, // Déclare le composant comme autonome
  imports: [
    RouterModule, // Pour router-outlet
    MembreHeaderComponent, // Ajout de MembreHeaderComponent
    MembreFooterComponent // Ajout de MembreFooterComponent
  ]
})
export class MembreLayoutComponent {}