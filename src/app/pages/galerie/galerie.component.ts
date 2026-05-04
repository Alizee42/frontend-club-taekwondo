import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalerieService, Galerie } from '../../services/galerie.service';
import { AuthService } from '../../services/auth.service';
import { ClubService, Club } from '../../services/club.service';
import { environment } from '../../../environments/environment';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-galerie',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './galerie.component.html',
  styleUrls: ['./galerie.component.css']
})
export class GalerieComponent implements OnInit, OnDestroy {
  images: Galerie[] = [];
  isLoading = true;
  selectedClubId: number | null = null;

  lightboxImage: Galerie | null = null;
  lightboxIndex = 0;

  private _subs = new Subscription();

  constructor(
    private galerieService: GalerieService,
    private authService: AuthService,
    private clubService: ClubService
  ) {}

  ngOnInit(): void {
    this._subs.add(
      this.clubService.selectedClub$.subscribe((club: Club | null) => {
        if (club?.id) {
          this.selectedClubId = club.id;
          this.loadImages(club.id);
        } else {
          const user = this.authService.getUtilisateurConnecte();
          if (user?.['clubId']) {
            this.selectedClubId = user['clubId'];
            this.loadImages(user['clubId']);
          } else {
            // Aucun club connu → on charge tout
            this.loadAll();
          }
        }
      })
    );

    this._subs.add(
      this.galerieService.imagesUpdated$.subscribe(() => {
        if (this.selectedClubId != null) {
          this.loadImages(this.selectedClubId);
        } else {
          this.loadAll();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  private buildUrl(img: Galerie): Galerie {
    const apiBase = environment.apiUrl.replace(/\/api\/?$/i, '');
    let raw = img.imageUrl || '';
    if (raw.startsWith('galerie/')) raw = raw.replace(/^galerie\//, '');
    let full = '';
    if (!raw) {
      full = '';
    } else if (raw.startsWith('http') || raw.startsWith('/')) {
      full = raw;
    } else {
      full = `${apiBase}/uploads/galerie/${encodeURIComponent(raw)}`;
    }
    const fallback = raw ? `${apiBase}/uploads/${encodeURIComponent(raw)}` : '';
    return { ...img, imageUrl: full, fallbackImageUrl: fallback } as any;
  }

  loadImages(clubId: number): void {
    this.isLoading = true;
    this.galerieService.getGaleriesByClub(clubId).subscribe({
      next: (data) => {
        this.images = (data || []).map(img => this.buildUrl(img));
        this.isLoading = false;
      },
      error: () => {
        this.images = [];
        this.isLoading = false;
      }
    });
  }

  loadAll(): void {
    this.isLoading = true;
    this.galerieService.getAll().subscribe({
      next: (data) => {
        this.images = (data || []).map(img => this.buildUrl(img));
        this.isLoading = false;
      },
      error: () => {
        this.images = [];
        this.isLoading = false;
      }
    });
  }

  handleImgError(event: Event, image: any) {
    const imgEl = event.target as HTMLImageElement;
    if (!imgEl.dataset['triedFallback'] && image.fallbackImageUrl) {
      imgEl.dataset['triedFallback'] = '1';
      imgEl.src = image.fallbackImageUrl;
    } else {
      imgEl.src = 'assets/images/default.jpg';
    }
  }

  openLightbox(index: number): void {
    this.lightboxIndex = index;
    this.lightboxImage = this.images[index];
    document.body.style.overflow = 'hidden';
  }

  closeLightbox(): void {
    this.lightboxImage = null;
    document.body.style.overflow = '';
  }

  prevImage(): void {
    this.lightboxIndex = (this.lightboxIndex - 1 + this.images.length) % this.images.length;
    this.lightboxImage = this.images[this.lightboxIndex];
  }

  nextImage(): void {
    this.lightboxIndex = (this.lightboxIndex + 1) % this.images.length;
    this.lightboxImage = this.images[this.lightboxIndex];
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if (!this.lightboxImage) return;
    if (e.key === 'Escape') this.closeLightbox();
    if (e.key === 'ArrowRight') this.nextImage();
    if (e.key === 'ArrowLeft') this.prevImage();
  }
}
