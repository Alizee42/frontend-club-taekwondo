import { Component } from '@angular/core';
import { AProposComponent } from '../a-propos/a-propos.component';
import { AvisComponent } from '../avis/avis.component';
import { HorairesComponent } from '../horaires/horaires.component';
import { ProfesseursComponent } from '../professeurs/professeurs.component';
import { ActualitesComponent } from '../actualites/actualites.component'; 
import { BanniereComponent } from '../banniere/banniere.component';

@Component({
  selector: 'app-accueil',
  standalone: true,
  imports: [
    BanniereComponent,
    AProposComponent,
    AvisComponent,
    HorairesComponent,
    ProfesseursComponent,
    ActualitesComponent 
  ],
  templateUrl: './accueil.component.html',
  styleUrls: ['./accueil.component.css']
})
export class AccueilComponent {}