import { Component, OnInit } from '@angular/core';
import { ClubService, Club } from '../../services/club.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-super-admin-clubs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clubs.component.html',
  styleUrls: ['./clubs.component.css']
})
export class ClubsComponent implements OnInit {
  clubs: Club[] = [];
  loading = false;

  // Form model
  newClub: Partial<Club> = { name: '', adresse: '', telephone: '', email: '', logo: '' };

  constructor(private clubService: ClubService) {}

  ngOnInit(): void {
    this.loadClubs();
  }

  loadClubs() {
    this.loading = true;
    this.clubService.getClubs().subscribe({
      next: (c) => { this.clubs = c; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  createClub() {
    if (!this.newClub.name || this.newClub.name.trim() === '') return;
    this.clubService.createClub(this.newClub).subscribe({
      next: (created) => {
        this.clubs.push(created);
        this.newClub = { name: '', adresse: '', telephone: '', email: '', logo: '' };
      },
      error: (err) => {
        console.error('Erreur création club', err);
      }
    });
  }
}