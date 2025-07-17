import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AvisService, Avis } from '../../../services/avis.service';
import Swiper from 'swiper/bundle';
import 'swiper/css/bundle';

@Component({
  selector: 'app-avis',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './avis.component.html',
  styleUrls: ['./avis.component.css'],
})
export class AvisComponent implements OnInit, AfterViewInit {
  avisApprouves: Avis[] = [];
  modaleOuverte = false;
  messageConfirmation: string | null = null;
  swiper: Swiper | null = null;

  nouvelAvis: Partial<Avis> = { contenu: '', pseudoVisiteur: '', note: 5 };
  photoPreview: string | null = null;
  photoFichier: File | null = null;

  constructor(private avisService: AvisService) {}

  ngOnInit(): void {
    this.chargerAvis();
  }

  ngAfterViewInit(): void {
    this.swiper = new Swiper('.avis-swiper', {
      loop: true,
      spaceBetween: 30,
      slidesPerView: 1,
      autoplay: { delay: 5000 },
      pagination: { el: '.swiper-pagination', clickable: true },
      navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
      breakpoints: {
        768: { slidesPerView: 2 },
      },
    });
  }

  chargerAvis(): void {
    this.avisService.getAvis().subscribe((avis) => {
      this.avisApprouves = avis.filter((a) => a.approuve);
    });
  }

  ouvrirModale(): void {
    this.modaleOuverte = true;
  }

  fermerModale(): void {
    this.modaleOuverte = false;
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.photoFichier = input.files[0];

      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        this.photoPreview = e.target?.result as string;
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  envoyerAvis(): void {
    if (this.nouvelAvis.contenu && this.nouvelAvis.pseudoVisiteur) {
      const formData = new FormData();
      formData.append('contenu', this.nouvelAvis.contenu);
      formData.append('pseudoVisiteur', this.nouvelAvis.pseudoVisiteur);
      formData.append('note', String(this.nouvelAvis.note ?? 0));
      formData.append('typeAvis', this.nouvelAvis.typeAvis ?? 'cours');

      if (this.photoFichier) {
        formData.append('photo', this.photoFichier);
      }

      this.avisService.ajouterAvis(formData).subscribe(() => {
        this.fermerModale();
        this.nouvelAvis = { contenu: '', pseudoVisiteur: '', note: 5 };
        this.photoPreview = null;
        this.photoFichier = null;
        this.chargerAvis();
      });
    }
  }
  getInitials(name: string): string {
    if (!name) return '';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  getPhotoUrl(photo: string): string {
    return `http://localhost:8080/uploads/avis/${photo}`;
  }

  masquerMessageApresDelai(): void {
    setTimeout(() => {
      this.messageConfirmation = null;
    }, 5000);
  }
}
