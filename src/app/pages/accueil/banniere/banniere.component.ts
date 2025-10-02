
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-banniere',
  standalone: true,
  imports: [RouterModule],
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

  constructor() {
    this.rotateSlogan();
  }

  rotateSlogan() {
    setInterval(() => {
      this.sloganIndex = (this.sloganIndex + 1) % this.slogans.length;
      this.currentSlogan = this.slogans[this.sloganIndex];
    }, 2500);
  }
}
