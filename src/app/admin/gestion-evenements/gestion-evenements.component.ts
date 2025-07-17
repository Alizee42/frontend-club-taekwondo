import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

// ✅ Importe tous les composants Angular utilisés dans le HTML
import { EvenementsListeComponent } from './evenements-liste/evenements-liste.component';
import { InscriptionsComponent } from './inscriptions/inscriptions.component';

@Component({
  selector: 'app-gestion-evenements',
  standalone: true,
  imports: [
    CommonModule,
    EvenementsListeComponent,
    InscriptionsComponent
  ],
  templateUrl: './gestion-evenements.component.html',
  styleUrls: ['./gestion-evenements.component.css']
})
export class GestionEvenementsComponent {
  vueActive: string = 'evenements-liste'; // Vue par défaut

  changerVue(vue: string): void {
    this.vueActive = vue;
  }
}