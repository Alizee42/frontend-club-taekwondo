import { Component } from '@angular/core';
import { AProposComponent } from '../accueil/a-propos/a-propos.component';
import { AvisComponent } from '../accueil/avis/avis.component';
import { HorairesComponent } from '../accueil/horaires/horaires.component';
import { ProfesseursComponent } from '../accueil/professeurs/professeurs.component';
import { ActualitesComponent } from '../accueil/actualites/actualites.component'; 
import { BanniereComponent } from '../accueil/banniere/banniere.component';

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