import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HorairesService } from '../../services/horaires.service';

@Component({
  selector: 'app-gestion-horaires',
  templateUrl: './gestion-horaires.component.html',
  styleUrls: ['./gestion-horaires.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class GestionHorairesComponent implements OnInit {
  horaires: any[] = [];
  newHoraire = {
    jour: '',
    heures: '',
    groupe: '',
    adresse: ''
  };
  showModal = false;

  // Liste des jours de la semaine
  joursSemaine = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  // Liste des tranches horaires
  tranchesHoraires = [
    '08h00 - 09h00',
    '09h00 - 10h00',
    '10h00 - 11h00',
    '11h00 - 12h00',
    '14h00 - 15h00',
    '15h00 - 16h00',
    '16h00 - 17h00',
    '17h00 - 18h00',
    '18h00 - 19h00',
    '19h00 - 20h00'
  ];

  constructor(private horairesService: HorairesService) {}

  ngOnInit(): void {
    this.horaires = this.horairesService.getHoraires();
  }

  openModal(): void {
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  addHoraire(): void {
    if (this.newHoraire.jour && this.newHoraire.adresse) {
      this.horairesService.addHoraire({
        jour: this.newHoraire.jour,
        heures: [{ time: this.newHoraire.heures, groupe: this.newHoraire.groupe }],
        adresse: this.newHoraire.adresse
      });
      this.newHoraire = { jour: '', heures: '', groupe: '', adresse: '' };
      this.closeModal();
    }
  }

  deleteHoraire(index: number): void {
    this.horairesService.deleteHoraire(index);
  }
}