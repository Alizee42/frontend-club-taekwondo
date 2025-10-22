import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ClubService, Club } from '../../services/club.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent implements OnInit, OnDestroy {
  readonly currentYear = new Date().getFullYear();
  selectedClub: Club | null = null;
  private clubSub?: any;

  constructor(private clubService: ClubService) {}

  ngOnInit() {
    this.clubSub = this.clubService.selectedClub$.subscribe(club => {
      this.selectedClub = club;
    });
  }

  ngOnDestroy() {
    if (this.clubSub) this.clubSub.unsubscribe();
  }
}
