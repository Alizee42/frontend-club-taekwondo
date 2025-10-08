import { Component } from '@angular/core';
import { Club } from '../../services/club.service';
import { ClubService } from '../../services/club.service';
import { CommonModule } from '@angular/common';
import { AProposComponent } from '../accueil/a-propos/a-propos.component';
import { AvisComponent } from '../accueil/avis/avis.component';
import { HorairesComponent } from '../accueil/horaires/horaires.component';
import { ProfesseursComponent } from '../accueil/professeurs/professeurs.component';
import { ActualitesComponent } from '../accueil/actualites/actualites.component'; 
import { BanniereComponent } from '../accueil/banniere/banniere.component';
import { ClubSelectComponent } from '../../club-select/club-select.component';
// import supprimé : le sélecteur de club n'est plus géré ici

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
    ClubSelectComponent
  ],
  templateUrl: './accueil.component.html',
  styleUrls: ['./accueil.component.css']
})
export class AccueilComponent {
  showClubModal = false;

  constructor(private clubService: ClubService) {
    const selectedClub = this.clubService.getSelectedClub();
    const token = localStorage.getItem('token');
    this.showClubModal = !selectedClub && !token;
  }

  get selectedClub(): Club | null {
    return this.clubService.getSelectedClub();
  }

  onClubSelected(club: Club) {
    this.showClubModal = false;
    // Optionnel : recharger les actualités ou rediriger
  }
}