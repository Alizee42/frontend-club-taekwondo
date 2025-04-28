import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // ← AJOUTER ÇA !

@Component({
  selector: 'app-galerie',
  standalone: true, // ← aussi important si tu veux un composant autonome
  templateUrl: './galerie.component.html',
  styleUrls: ['./galerie.component.css'],
  imports: [CommonModule] // ← AJOUTER ÇA !
})
export class GalerieComponent implements OnInit {
  images = [
    { url: 'assets/images/event1.jpg', alt: 'Événement 1' },
    { url: 'assets/images/event2.jpg', alt: 'Événement 2' },
    { url: 'assets/images/event3.jpg', alt: 'Événement 3' },
    { url: 'assets/images/event4.jpg', alt: 'Événement 4' },
    { url: 'assets/images/event5.jpg', alt: 'Événement 5' },
    { url: 'assets/images/event6.jpg', alt: 'Événement 6' },
    { url: 'assets/images/event7.jpg', alt: 'Événement 7' },
    { url: 'assets/images/event8.jpg', alt: 'Événement 8' },
  ];

  constructor() {}

  ngOnInit(): void {}
}
