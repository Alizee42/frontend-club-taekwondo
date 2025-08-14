import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AvisService, Avis } from '../../../services/avis.service';
import { ToastService } from '../../../shared/toast/toast.service';
import Swiper from 'swiper/bundle';
import 'swiper/css/bundle';

@Component({
  selector: 'app-avis',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './avis.component.html',
  styleUrls: ['./avis.component.css'],
})
export class AvisComponent implements OnInit, AfterViewInit, OnDestroy {
  avisApprouves: Avis[] = [];
  modaleOuverte = false;
  messageConfirmation: string | null = null;
  swiper: Swiper | null = null;

  // ✅ typeAvis optionnel (aucune valeur par défaut)
  nouvelAvis: Partial<Avis> = { contenu: '', pseudoVisiteur: '', note: 5, typeAvis: '' };
  photoPreview: string | null = null;
  photoFichier: File | null = null;

  // Liste blanche des sujets autorisés
  private readonly allowedTypes = ['cours', 'entraineurs', 'evenements', 'organisation', 'competitions'] as const;

  constructor(private avisService: AvisService, private toast: ToastService) {}

  ngOnInit(): void { this.chargerAvis(); }
  ngAfterViewInit(): void {}
  ngOnDestroy(): void { if (this.swiper) { this.swiper.destroy(true, true); this.swiper = null; } }

  private initOrUpdateSwiper(): void {
    if (this.swiper) { this.swiper.update(); return; }
    this.swiper = new Swiper('.avis-swiper', {
      loop: true, spaceBetween: 30, slidesPerView: 1,
      autoplay: { delay: 5000 },
      pagination: { el: '.swiper-pagination', clickable: true },
      navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
      breakpoints: { 768: { slidesPerView: 2 } },
    });
  }

  chargerAvis(): void {
    this.avisService.getAvis().subscribe({
      next: (avis) => {
        this.avisApprouves = (avis || []).filter(a => a.approuve);
        setTimeout(() => this.initOrUpdateSwiper());
      },
      error: () => this.toast.error('Impossible de charger les avis pour le moment. Veuillez réessayer plus tard.')
    });
  }

  trackByAvisId = (_: number, a: { id?: string | number }) => a?.id ?? _;

  ouvrirModale(): void { this.modaleOuverte = true; }
  fermerModale(): void { this.modaleOuverte = false; }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) { 
      this.toast.warning('Veuillez sélectionner un fichier image.'); 
      return; 
    }
    if (file.size > 3_000_000) { 
      this.toast.warning('Image trop volumineuse (maximum 3 Mo).'); 
      return; 
    }

    this.photoFichier = file;
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => { this.photoPreview = e.target?.result as string; };
    reader.readAsDataURL(file);
  }

  envoyerAvis(): void {
    if (!this.nouvelAvis.contenu?.trim() || !this.nouvelAvis.pseudoVisiteur?.trim()) {
      this.toast.warning('Veuillez renseigner le contenu et votre nom/pseudo.');
      return;
    }

    const noteNum = Math.max(1, Math.min(5, +(this.nouvelAvis.note ?? 5)));
    const formData = new FormData();
    formData.append('contenu', (this.nouvelAvis.contenu ?? '').trim());
    formData.append('pseudoVisiteur', (this.nouvelAvis.pseudoVisiteur ?? '').trim());
    formData.append('note', String(noteNum));

    // ✅ N’envoie typeAvis que s’il est choisi et validé
    const type = this.sanitizeTypeAvis(this.nouvelAvis.typeAvis);
    if (type) formData.append('typeAvis', type);

    if (this.photoFichier) formData.append('photo', this.photoFichier);

    this.avisService.ajouterAvis(formData).subscribe({
      next: () => {
        this.toast.success('Votre avis a été envoyé avec succès');
        this.messageConfirmation = 'Merci ! Votre avis sera publié après validation par notre équipe.';
        this.fermerModale();

        // ✅ Reset sans valeur par défaut pour typeAvis
        this.nouvelAvis = { contenu: '', pseudoVisiteur: '', note: 5, typeAvis: '' };
        this.photoPreview = null; 
        this.photoFichier = null;

        this.chargerAvis();
        setTimeout(() => this.messageConfirmation = null, 5000);
      },
      error: () => this.toast.error('Une erreur est survenue lors de l’envoi. Veuillez réessayer plus tard.')
    });
  }

  private sanitizeTypeAvis(s?: string): string {
    const k = (s ?? '').toLowerCase().trim();
    return this.allowedTypes.includes(k as any) ? k : '';
  }

  getInitials(name: string): string {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  getPhotoUrl(photo: string): string {
    return `http://localhost:8080/uploads/avis/${encodeURIComponent(photo)}`;
  }
}
