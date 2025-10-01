import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-politique-confidentialite',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './politique-confidentialite.component.html',
  styleUrls: ['./politique-confidentialite.component.css']
})
export class PolitiqueConfidentialiteComponent {
  derniereMiseAJour: string = '01/10/2025';
}
