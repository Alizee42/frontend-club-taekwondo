import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Club {
  id: string;
  name: string;
  logo?: string;
}

@Component({
  selector: 'app-club-select',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './club-select.component.html',
  styleUrls: ['./club-select.component.css']
})
export class ClubSelectComponent {
  @Output() clubSelected = new EventEmitter<Club>();
  clubs: Club[] = [
    { id: 'villeurbanne', name: 'Olympique Taekwondo Villeurbanne' },
    { id: 'villards', name: 'Olympique Taekwondo Villards-les-Dombes' },
    { id: 'bourg', name: 'Olympique Taekwondo Bourg-en-Bresse' },
    { id: 'amberieux', name: 'Olympique Taekwondo Ambérieux' }
  ];

  selectClub(club: Club) {
    localStorage.setItem('selectedClub', JSON.stringify(club));
    this.clubSelected.emit(club);
  }
}
