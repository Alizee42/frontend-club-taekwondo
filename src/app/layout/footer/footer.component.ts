import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ClubService, Club } from '../../services/club.service';
import { HorairesService } from '../../services/horaires.service';

interface JourResume {
  jour: string;
  plage: string;
}

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent implements OnInit, OnDestroy {
  readonly currentYear = new Date().getFullYear();
  selectedClub: Club | null = null;
  joursResume: JourResume[] = [];
  private clubSub?: any;

  private readonly ordreJours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  constructor(
    private clubService: ClubService,
    private horairesService: HorairesService
  ) {}

  ngOnInit() {
    this.clubSub = this.clubService.selectedClub$.subscribe(club => {
      this.selectedClub = club;
      if (club?.id) {
        this.chargerHorairesResume(club.id);
      } else {
        this.joursResume = [];
      }
    });
  }

  ngOnDestroy() {
    if (this.clubSub) this.clubSub.unsubscribe();
  }

  private chargerHorairesResume(clubId: number): void {
    this.horairesService.getHorairesByClub(clubId).subscribe({
      next: (horaires) => {
        const map = new Map<string, string>();
        (horaires || []).forEach(h => {
          if (!map.has(h.jour)) {
            const plage = h.plage || (h.heureDebut && h.heureFin ? `${h.heureDebut} - ${h.heureFin}` : '');
            map.set(h.jour, plage);
          }
        });
        this.joursResume = this.ordreJours
          .filter(j => map.has(j))
          .map(j => ({ jour: j, plage: map.get(j)! }))
          .slice(0, 4);
      },
      error: () => {
        this.joursResume = [];
      }
    });
  }
}
