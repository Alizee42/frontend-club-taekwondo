import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ListeCbComponent } from './liste-cb/liste-cb.component';
import { ListeClubComponent } from './liste-club/liste-club.component';
import { HistoriqueCommandesComponent } from './historique-commandes/historique-commandes.component';
import { DisponibiliteComponent } from './disponibilite/disponibilite.component';

@Component({
  selector: 'app-gestion-commande',
  standalone: true,
  imports: [
    CommonModule,
    ListeCbComponent,
    ListeClubComponent,
    HistoriqueCommandesComponent,
    DisponibiliteComponent
  ],
  templateUrl: './gestion-commande.component.html',
  styleUrls: ['./gestion-commande.component.css']
})
export class GestionCommandeComponent {
  vueActive: string = 'cb'; // valeurs possibles : cb | club | historique | disponibilite

  changerVue(nouvelleVue: string) {
    this.vueActive = nouvelleVue;
  }
}
