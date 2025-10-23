import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalerieService, Galerie } from '../../services/galerie.service';
import { AuthService } from '../../services/auth.service';
import { ClubService, Club } from '../../services/club.service';

@Component({
  selector: 'app-galerie',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './galerie.component.html',
  styleUrls: ['./galerie.component.css']
})
export class GalerieComponent implements OnInit {
  images: Galerie[] = [];
  clubs: Club[] = [];
  selectedClubId: number | null = null;
  role: string = '';

  constructor(
    private galerieService: GalerieService,
    private authService: AuthService,
    private clubService: ClubService
  ) {}

  ngOnInit(): void {
    this.role = (this.authService.getRole() || '').toString().toUpperCase();
    if (this.role === 'SUPER_ADMIN') {
      this.clubService.getClubs().subscribe(clubs => {
        this.clubs = clubs;
        // Par défaut, sélectionne le premier club
        if (clubs.length > 0) {
          this.selectedClubId = clubs[0].id;
          this.loadImages(this.selectedClubId);
        }
      });
    } else {
      const user = this.authService.getUtilisateurConnecte();
      this.selectedClubId = user?.['clubId'] || null;
      if (this.selectedClubId) {
        this.loadImages(this.selectedClubId);
      }
    }
  }

  onClubChange(clubId: number) {
    this.selectedClubId = clubId;
    this.loadImages(clubId);
  }

  loadImages(clubId: number): void {
    this.galerieService.getGaleriesByClub(clubId).subscribe((data) => {
      this.images = data;
    });
  }
}