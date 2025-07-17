import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; 
import { ActualiteService } from '../../../services/actualite.service';

@Component({
  selector: 'app-actualites',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './actualites.component.html',
  styleUrls: ['./actualites.component.css']
})
export class ActualitesComponent implements OnInit {
  news: any[] = [];           // Liste des actualités
  filteredNews: any[] = [];   // Actualités filtrées pour la pagination
  featuredNews: any = null;   // Actualité mise en avant (à la une)
  regularNews: any[] = [];    // Actualités régulières (non à la une)
  currentPage: number = 1;    // Page courante pour la pagination
  pageSize: number = 3;       // Nombre d'actualités par page

  constructor(private actualiteService: ActualiteService) {}

  ngOnInit(): void {
    this.loadActualites();
  }

  loadActualites(): void {
    this.actualiteService.getAll().subscribe({
      next: (data) => {
        this.news = data;
        this.updateFeaturedNews();
        this.updateRegularNews();
        this.updateFilteredNews();
      },
      error: (err) => {
        console.error('Erreur de chargement des actualités :', err);
      }
    });
  }

  updateFeaturedNews(): void {
    this.featuredNews = this.news.find(item => item.isFeatured) || null;
  }

  updateRegularNews(): void {
    this.regularNews = this.news.filter(item => !item.isFeatured);
  
    // Si une seule actualité régulière, appliquer une classe spécifique
    if (this.regularNews.length === 1) {
      document.querySelector('.actu-grid')?.classList.add('single-card');
    } else {
      document.querySelector('.actu-grid')?.classList.remove('single-card');
    }
  }

  updateFilteredNews(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.filteredNews = this.regularNews.slice(start, end);
  }

  loadMore(): void {
    this.currentPage++;
    this.updateFilteredNews();
  }

  loadLess(): void {
    this.currentPage = 1;
    this.updateFilteredNews();
  }

  trackById(index: number, item: any): any {
    return item.id;
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    target.src = 'assets/images/default.jpg';
  }
}