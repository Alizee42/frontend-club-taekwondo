import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClubService, Club } from '../services/club.service';

@Component({
  selector: 'app-club-select',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './club-select.component.html',
  styleUrls: ['./club-select.component.css']
})
export class ClubSelectComponent {
  @Output() clubSelected = new EventEmitter<Club>();
  clubs: Club[] = [];
  loading = true;
  error: string | null = null;

  constructor(private clubService: ClubService) {
    this.clubService.getClubs().subscribe({
      next: (clubs) => {
        this.clubs = clubs;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Erreur lors du chargement des clubs.';
        this.loading = false;
      }
    });
  }

  selectClub(club: Club) {
    this.clubService.setSelectedClub(club);
    this.clubSelected.emit(club);
  }
}
