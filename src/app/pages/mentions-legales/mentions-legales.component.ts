import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ClubService } from '../../services/club.service';
import { MentionsLegalesConfigService, MentionsLegalesConfig } from '../../services/mentions-legales-config.service';

@Component({
  selector: 'app-mentions-legales',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './mentions-legales.component.html',
  styleUrls: ['./mentions-legales.component.css']
})
export class MentionsLegalesComponent implements OnInit {
  derniereMiseAJour: string = '01/10/2025';
  config: MentionsLegalesConfig = {};
  loaded = false;

  constructor(
    private clubService: ClubService,
    private mentionsLegalesConfigService: MentionsLegalesConfigService
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
    this.mentionsLegalesConfigService.getConfig(clubId).subscribe({
      next: (c) => {
        this.config = c;
        this.loaded = true;
      },
      error: () => { this.loaded = true; }
    });
  }
}
