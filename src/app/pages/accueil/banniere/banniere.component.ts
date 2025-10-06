
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ClubService, Club } from '../../../services/club.service';

@Component({
  selector: 'app-banniere',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './banniere.component.html',
  styleUrl: './banniere.component.css'
})
export class BanniereComponent {
  slogans: string[] = [
    'Discipline',
    'Respect',
    'Dépassement de soi',
    'Esprit d’équipe',
    'Performance',
    'Confiance'
  ];
  currentSlogan: string = this.slogans[0];
  private sloganIndex = 0;
  selectedClub: Club | null = null;

  constructor(private clubService: ClubService) {
    this.selectedClub = this.clubService.getSelectedClub();
    this.rotateSlogan();
  }

  rotateSlogan() {
    setInterval(() => {
      this.sloganIndex = (this.sloganIndex + 1) % this.slogans.length;
      this.currentSlogan = this.slogans[this.sloganIndex];
    }, 2500);
  }
}
