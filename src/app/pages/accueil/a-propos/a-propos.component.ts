import { Component } from '@angular/core';
import { ClubService, Club } from '../../../services/club.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-a-propos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './a-propos.component.html',
  styleUrl: './a-propos.component.css'
})
export class AProposComponent {
  selectedClub: Club | null = null;

  constructor(private clubService: ClubService) {
    this.selectedClub = this.clubService.getSelectedClub();
  }
}
