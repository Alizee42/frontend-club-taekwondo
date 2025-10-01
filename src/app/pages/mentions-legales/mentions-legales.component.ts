import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-mentions-legales',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './mentions-legales.component.html',
  styleUrls: ['./mentions-legales.component.css']
})
export class MentionsLegalesComponent {
  // Tu peux ajouter plus tard des propriétés dynamiques si nécessaire
  derniereMiseAJour: string = '01/10/2025';
}
