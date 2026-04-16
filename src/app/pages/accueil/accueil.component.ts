import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
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
    CommonModule,
    BanniereComponent,
    AProposComponent,
    AvisComponent,
    HorairesComponent,
    ProfesseursComponent,
    ActualitesComponent,
  ],
  templateUrl: './accueil.component.html',
  styleUrls: ['./accueil.component.css']
})
export class AccueilComponent {}
