import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ClubService } from '../../services/club.service';
import { PolitiqueConfidentialiteConfigService, PolitiqueConfidentialiteConfig } from '../../services/politique-confidentialite-config.service';

@Component({
  selector: 'app-politique-confidentialite',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './politique-confidentialite.component.html',
  styleUrls: ['./politique-confidentialite.component.css']
})
export class PolitiqueConfidentialiteComponent implements OnInit {
  derniereMiseAJour: string = '01/10/2025';
  config: PolitiqueConfidentialiteConfig = {};
  loaded = false;

  constructor(
    private clubService: ClubService,
    private politiqueConfidentialiteConfigService: PolitiqueConfidentialiteConfigService
  ) {}

  ngOnInit(): void {
    const selected = this.clubService.getSelectedClub();
    if (selected?.id) {
      this.loadConfig(selected.id);
    } else {
      this.clubService.getClubs().subscribe({
        next: (clubs) => {
          const club = clubs?.[0];
          if (club?.id) this.loadConfig(club.id);
        },
        error: () => {}
      });
    }
  }

  private loadConfig(clubId: number): void {
    this.politiqueConfidentialiteConfigService.getConfig(clubId).subscribe({
      next: (c) => {
        this.config = c;
        this.loaded = true;
      },
      error: () => { this.loaded = true; }
    });
  }
}
