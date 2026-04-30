import { Component, OnInit, OnDestroy } from '@angular/core';
import { GroupByPipe } from '../../../pipes/group-by.pipe';
import { CommonModule } from '@angular/common';
import { HorairesService } from '../../../services/horaires.service';
import { ClubSelectionService } from '../../../services/club-selection.service';

@Component({
  selector: 'app-horaires',
  templateUrl: './horaires.component.html',
  styleUrls: ['./horaires.component.css'],
  standalone: true,
  imports: [CommonModule, GroupByPipe] // Ajout du pipe groupBy pour le template
})
export class HorairesComponent implements OnInit, OnDestroy {
  horairesParJour: any[] = [];
  private clubIdSubscription: any;

  constructor(
    private horairesService: HorairesService,
    private clubSelectionService: ClubSelectionService
  ) {}

  ngOnInit(): void {
    this.clubIdSubscription = this.clubSelectionService.selectedClubId$.subscribe(clubId => {
      if (clubId) {
        this.horairesService.getHorairesByClub(clubId).subscribe(horaires => {
          // Regrouper par jour
          const map = new Map<string, any[]>();
          horaires.forEach(h => {
            if (!map.has(h.jour)) map.set(h.jour, []);
            map.get(h.jour)!.push(h);
          });
          this.horairesParJour = Array.from(map.entries()).map(([jour, items]) => ({
            jour,
            horaires: items
          }));
        });
      } else {
        this.horairesParJour = [];
      }
    });
  }

  ngOnDestroy(): void {
    if (this.clubIdSubscription) { this.clubIdSubscription.unsubscribe(); }
  }
}
