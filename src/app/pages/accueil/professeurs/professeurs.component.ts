import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClubService } from '../../../services/club.service';
import { EnseignantService, Enseignant } from '../../../services/enseignant.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-professeurs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './professeurs.component.html',
  styleUrls: ['./professeurs.component.css'],
})
export class ProfesseursComponent implements OnInit {
  readonly fallbackPhoto = 'assets/images/dobok.jpg';

  // On conserve la forme utilisée par le template (photo, nom, prenom...)
  professeurs: Array<{
    id?: number;
    nom: string;
    prenom: string;
    specialite?: string;
    description?: string;
    photo?: string;
  }> = [];
  loading = false;
  apiError = false;

  constructor(
    private clubService: ClubService,
    private enseignantService: EnseignantService
  ) {}

  ngOnInit(): void {
    const club = this.clubService.getSelectedClub();
    const clubId = club?.id;
    if (!clubId) {
      // Pas de club sélectionné: garder la liste vide
      return;
    }
    this.loading = true;
    this.apiError = false;
    this.enseignantService.getByClub(clubId).subscribe({
      next: (list: Enseignant[]) => {
        this.professeurs = list.map((e) => ({
          id: e.id,
          nom: e.nom,
          prenom: e.prenom,
          specialite: e.specialite,
          description: e.description,
          photo: this.resolvePhotoUrl(e.photoUrl),
        }));
        this.loading = false;
      },
      error: () => {
        this.professeurs = [];
        this.apiError = true;
        this.loading = false;
      }
    });
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).src = this.fallbackPhoto;
  }

  private resolvePhotoUrl(photoUrl?: string): string {
    const raw = (photoUrl || '').trim();
    const apiBase = environment.apiUrl.replace(/\/api\/?$/, '');

    if (!raw) {
      return this.fallbackPhoto;
    }

    if (raw.startsWith('http') || raw.startsWith('data:image') || raw.startsWith('assets/')) {
      return raw;
    }

    if (raw.startsWith('uploads/')) {
      return `${apiBase}/${raw}`;
    }

    if (raw.startsWith('enseignants/')) {
      return `${apiBase}/uploads/${raw}`;
    }

    return `${apiBase}/uploads/enseignants/${encodeURIComponent(raw)}`;
  }
}
