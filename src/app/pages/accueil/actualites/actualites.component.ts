import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { ActualiteService } from '../../../services/actualite.service';
import { ClubSelectionService } from '../../../services/club-selection.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-actualites',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './actualites.component.html',
  styleUrls: ['./actualites.component.css']
})
export class ActualitesComponent implements OnInit, OnDestroy {
  news: any[] = [];
  filteredNews: any[] = [];
  currentPage = 1;
  readonly pageSize = 3;
  loading = false;
  apiError = false;

  private clubIdSubscription?: Subscription;

  constructor(
    private actualiteService: ActualiteService,
    private clubSelectionService: ClubSelectionService
  ) {}

  ngOnInit(): void {
    this.clubIdSubscription = this.clubSelectionService.selectedClubId$.subscribe(clubId => {
      if (clubId) this.loadActualitesClub(clubId);
    });
  }

  ngOnDestroy(): void {
    if (this.clubIdSubscription) this.clubIdSubscription.unsubscribe();
  }

  loadActualitesClub(clubId: number): void {
    const apiBase = environment.apiUrl.replace(/\/api\/?$/, '');
    this.loading = true;
    this.apiError = false;
    this.actualiteService.getActualitesByClub(clubId).subscribe({
      next: (data) => {
        this.news = (Array.isArray(data) ? data : []).map(actu => {
          let raw = actu.imageUrl || actu.image || '';
          if (raw.startsWith('actualites/')) raw = raw.replace(/^actualites\//, '');
          let full = '';
          if (!raw) {
            full = '';
          } else if (raw.startsWith('http') || raw.startsWith('data:image')) {
            full = raw;
          } else {
            full = `${apiBase}/uploads/actualites/${encodeURIComponent(raw)}`;
          }
          return { ...actu, imageUrl: full };
        });
        this.currentPage = 1;
        this.loading = false;
        this.updateFilteredNews();
      },
      error: () => {
        this.news = [];
        this.filteredNews = [];
        this.apiError = true;
        this.loading = false;
      }
    });
  }

  updateFilteredNews(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.filteredNews = this.news.slice(start, start + this.pageSize);
  }

  get hasMore(): boolean {
    return this.currentPage * this.pageSize < this.news.length;
  }

  loadMore(): void {
    this.currentPage++;
    this.updateFilteredNews();
  }

  trackById(index: number, item: any): any {
    return item.id;
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).src = 'assets/images/dobok.jpg';
  }
}
