import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Importation de FormsModule

@Component({
  selector: 'app-avis',
  standalone: true, // Indique que le composant est autonome
  imports: [CommonModule, FormsModule], // Ajout de FormsModule ici
  templateUrl: './avis.component.html',
  styleUrls: ['./avis.component.css']
})
export class AvisComponent {
  @ViewChild('testimonialCarousel') carousel!: ElementRef;

  avisList = [
    {
      photo: 'https://via.placeholder.com/100',
      contenu: 'Service impeccable, je recommande vivement !',
      nom: 'Jean',
      prenom: 'Dupont'
    },
    {
      photo: 'https://via.placeholder.com/100',
      contenu: 'Très satisfait, merci pour votre professionnalisme.',
      nom: 'Marie',
      prenom: 'Curie'
    },
    {
      photo: 'https://via.placeholder.com/100',
      contenu: 'Une expérience incroyable, merci beaucoup !',
      nom: 'Albert',
      prenom: 'Einstein'
    },
    {
      photo: 'https://via.placeholder.com/100',
      contenu: 'Un service rapide et efficace, je suis ravi !',
      nom: 'Isaac',
      prenom: 'Newton'
    },
    {
      photo: 'https://via.placeholder.com/100',
      contenu: 'Une équipe très professionnelle et à l’écoute.',
      nom: 'Nikola',
      prenom: 'Tesla'
    },
    {
      photo: 'https://via.placeholder.com/100',
      contenu: 'Je suis impressionné par la qualité du service.',
      nom: 'Ada',
      prenom: 'Lovelace'
    }
  ];

  modalOuvert = false;
  nouvelAvis = {
    nom: '',
    prenom: '',
    photo: '',
    contenu: ''
  };

  ouvrirModal() {
    this.modalOuvert = true;
  }

  fermerModal() {
    this.modalOuvert = false;
  }

  soumettreAvis() {
    if (this.nouvelAvis.nom && this.nouvelAvis.prenom && this.nouvelAvis.contenu) {
      this.avisList.push({ ...this.nouvelAvis });
      this.nouvelAvis = { nom: '', prenom: '', photo: '', contenu: '' };
      this.fermerModal();
    }
  }

  scrollCarousel(direction: 'left' | 'right') {
    const carousel = this.carousel.nativeElement;
    const scrollAmount = 300; // Largeur d'un élément
    if (direction === 'left') {
      carousel.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }
}