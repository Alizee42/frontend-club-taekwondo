import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

// ✅ Importe tous les composants Angular utilisés dans le HTML
import { DashboardPaiementComponent } from './dashboard-paiement/dashboard-paiement.component';
import { UtilisateursPaiementComponent } from './utilisateurs-paiement/utilisateurs-paiement.component';
import { SuiviPaiementsComponent } from './suivi-paiements/suivi-paiements.component';
import { EcheancesComponent } from './echeances/echeances.component';
import { AjoutPaiementComponent } from './ajout-paiement/ajout-paiement.component';
import { ParametresPaiementComponent } from './parametres-paiement/parametres-paiement.component';

@Component({
  selector: 'app-gestion-paiements',
  standalone: true,
  imports: [
    CommonModule,
    DashboardPaiementComponent,
    UtilisateursPaiementComponent,
    SuiviPaiementsComponent,
    EcheancesComponent,
    AjoutPaiementComponent,
    ParametresPaiementComponent
  ],
  templateUrl: './gestion-paiements.component.html',
  styleUrls: ['./gestion-paiements.component.css']
})
export class GestionPaiementsComponent {
  vueActive: string = 'dashboard';

  changerVue(vue: string) {
    this.vueActive = vue;
  }
}
