import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // Pour *ngFor et *ngIf
import { FormsModule } from '@angular/forms'; // Pour [(ngModel)]
import { HttpClientModule } from '@angular/common/http'; // Pour les requêtes HTTP
import { AvisService, Avis } from '../../../services/avis.service';
import Swiper from 'swiper/bundle'; // Import Swiper bundle
import 'swiper/css/bundle'; // Import des styles Swiper

@Component({
  selector: 'app-avis',
  standalone: true, // Composant autonome
  imports: [CommonModule, FormsModule, HttpClientModule], // Import des modules nécessaires
  templateUrl: './avis.component.html',
  styleUrls: ['./avis.component.css'],
})
export class AvisComponent implements OnInit, AfterViewInit {
  avisApprouves: Avis[] = []; // Liste des avis approuvés
  modaleOuverte = false; // État de la modale
  nouvelAvis: Partial<Avis> = { contenu: '', pseudoVisiteur: '', note: 5 }; // Avis par défaut
  messageConfirmation: string | null = null; // Message de confirmation
  swiper: Swiper | null = null; // Instance de Swiper

  constructor(private avisService: AvisService) {}

  ngOnInit(): void {
    this.chargerAvis(); // Charger les avis au démarrage
  }

  /**
   * Initialise Swiper après que la vue a été rendue.
   */
  ngAfterViewInit(): void {
    this.swiper = new Swiper('.avis-swiper', {
      loop: true, // Boucle infinie
      spaceBetween: 30, // Espacement entre les slides
      slidesPerView: 1, // Nombre de slides visibles
      autoplay: {
        delay: 5000, // Délai entre les slides
      },
      pagination: {
        el: '.swiper-pagination', // Pagination
        clickable: true, // Pagination cliquable
      },
      navigation: {
        nextEl: '.swiper-button-next', // Bouton suivant
        prevEl: '.swiper-button-prev', // Bouton précédent
      },
      breakpoints: {
        768: {
          slidesPerView: 2, // 2 slides visibles sur les écrans moyens
        },
      },
    });
  }

  /**
   * Charge les avis approuvés depuis le service.
   */
  chargerAvis(): void {
    this.avisService.getAvis().subscribe((avis) => {
      this.avisApprouves = avis.filter((a) => a.approuve); // Filtrer les avis approuvés
    });
  }

  /**
   * Ouvre la modale pour laisser un avis.
   */
  ouvrirModale(): void {
    this.modaleOuverte = true;
  }

  /**
   * Ferme la modale.
   */
  fermerModale(): void {
    this.modaleOuverte = false;
  }

  /**
   * Envoie un nouvel avis au service.
   */
  photoPreview: string | null = null; // Aperçu de la photo

onPhotoSelected(event: Event): void {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      this.photoPreview = e.target?.result as string;
    };
    reader.readAsDataURL(input.files[0]);
  }
}

envoyerAvis(): void {
  if (this.nouvelAvis.contenu && this.nouvelAvis.pseudoVisiteur) {
    const avisAEnvoyer = {
      ...this.nouvelAvis,
      approuve: false,
      photo: this.photoPreview || null, // Ajouter la photo si elle existe
    };
    this.avisService.ajouterAvis(avisAEnvoyer as Avis).subscribe(() => {
      this.fermerModale(); // Fermer la modale après l'envoi
      this.nouvelAvis = { contenu: '', pseudoVisiteur: '', note: 5 }; // Réinitialiser le formulaire
      this.photoPreview = null; // Réinitialiser l'aperçu de la photo
    });
  }
  }

  /**
   * Masque le message de confirmation après un délai.
   */
  masquerMessageApresDelai(): void {
    setTimeout(() => {
      this.messageConfirmation = null;
    }, 5000); // Masquer après 5 secondes
  }
  
}