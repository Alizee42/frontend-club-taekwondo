import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ClubService, Club } from '../../services/club.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent {
  readonly currentYear = new Date().getFullYear();
  selectedClub: Club | null = null;

  constructor(private clubService: ClubService) {
    this.selectedClub = this.clubService.getSelectedClub();
  }
}
