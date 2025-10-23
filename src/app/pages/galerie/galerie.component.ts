import { Component, OnInit, OnDestroy } from '@angular/core';
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
export class GalerieComponent implements OnInit {
  images: Galerie[] = [];
  // pas de selecteur ici ; on affiche uniquement les images du club sélectionné
  selectedClubId: number | null = null;
  role: string = '';
  private _subs = new Subscription();

  constructor(
    private galerieService: GalerieService,
    private authService: AuthService,
    private clubService: ClubService
  ) {}

  ngOnInit(): void {
    this.role = (this.authService.getRole() || '').toString().toUpperCase();
    console.log('[Galerie] ngOnInit, role =', this.role);
    // S'abonner à la sélection globale de club (si l'app propose un sélecteur elsewhere)
    this._subs.add(
      this.clubService.selectedClub$.subscribe((club: Club | null) => {
        console.log('[Galerie] clubService.selectedClub$ ->', club);
        if (club && club.id) {
          if (this.selectedClubId !== club.id) {
            this.selectedClubId = club.id;
            this.loadImages(this.selectedClubId as number);
          }
        } else {
          // Pas de club sélectionné via le service : fallback sur l'utilisateur connecté
          const user = this.authService.getUtilisateurConnecte();
          console.log('[Galerie] utilisateur connecté (fallback)', user);
          if (!this.selectedClubId && user?.['clubId']) {
            this.selectedClubId = user['clubId'];
            this.loadImages(this.selectedClubId as number);
          } else if (!this.selectedClubId) {
            console.warn('[Galerie] aucun club sélectionné — aucune image affichée');
            this.images = [];
          }
        }
      })
    );

    // subscribe to updates so the public gallery reloads after admin creates/edits/deletes
    this._subs.add(
      this.galerieService.imagesUpdated$.subscribe(() => {
        console.log('[Galerie] imagesUpdated$ event received');
        if (this.selectedClubId != null) {
          this.loadImages(this.selectedClubId);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  onClubChange(clubId: number) {
    this.selectedClubId = clubId;
    this.loadImages(clubId);
  }
  /**
   * Charge les images. Si clubId est null => charge toutes les images publiques (getAll()).
   */
  /** Charge les images d'un club donné (clubId non null) */
  loadImages(clubId: number): void {
    if (clubId == null) {
      console.warn('[Galerie] loadImages appelé sans clubId');
      this.images = [];
      return;
    }
    console.log('[Galerie] loadImages called for clubId=', clubId);
    const apiBase = environment.apiUrl.replace(/\/api\/?$/i, '');

    this.galerieService.getGaleriesByClub(clubId).subscribe((data) => {
      console.log('[Galerie] getGaleriesByClub response count=', data?.length, data);
      this.images = (data || []).map(img => {
        let raw = img.imageUrl || '';
        console.log('[Galerie] original image.imageUrl=', img.imageUrl);
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
        console.log('[Galerie] mapped image -> raw=', raw, 'full=', full, 'fallback=', fallback);
        return { ...img, imageUrl: full, fallbackImageUrl: fallback } as any;
      });
    }, (err) => {
      console.error('[Galerie] erreur getGaleriesByClub', err);
      this.images = [];
    });
  }

  // Réagir à l'erreur de chargement d'une image : essayer le fallback puis une image par défaut
  handleImgError(event: Event, image: any) {
    const imgEl = event.target as HTMLImageElement;
    try {
      console.warn('[Galerie] image load error for', image, 'current src=', imgEl.src);
      if (!imgEl.dataset['triedFallback'] && image.fallbackImageUrl) {
        imgEl.dataset['triedFallback'] = '1';
        console.log('[Galerie] trying fallback image URL=', image.fallbackImageUrl);
        imgEl.src = image.fallbackImageUrl;
      } else {
        console.log('[Galerie] using default image');
        imgEl.src = 'assets/images/default.jpg';
      }
    } catch (e) {
      imgEl.src = 'assets/images/default.jpg';
    }
  }
}