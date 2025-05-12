import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; // <-- Ajoute ça
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
  news: any[] = [];
  filteredNews: any[] = [];
  currentPage: number = 1;  // Page courante pour la pagination
  pageSize: number = 3;     // Nombre d'actualités par page

  constructor(private actualiteService: ActualiteService) {}

  ngOnInit(): void {
    this.loadActualites();
  }

  // Charger les actualités
  loadActualites(): void {
    this.actualiteService.getAll().subscribe({
      next: (data) => {
        this.news = data;
        this.updateFilteredNews();
      },
      error: (err) => {
        console.error('Erreur de chargement des actualités :', err);
      }
    });
  }

  // Met à jour les actualités filtrées pour la page courante
  updateFilteredNews(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.filteredNews = this.news.slice(start, end);
  }

  // Charger plus d'actualités
  loadMore(): void {
    this.currentPage++;
    this.updateFilteredNews();
  }

  // Revenir aux 3 premières actualités
  loadLess(): void {
    this.currentPage = 1;
    this.updateFilteredNews();
  }

  // Filtrer les actualités par catégorie
  filterNews(category: string): void {
    if (category === 'all') {
      this.filteredNews = this.news;
    } else {
      this.filteredNews = this.news.filter(item => item.typeActu === category);
    }
  }

  // Tracer par ID
  trackById(index: number, item: any): any {
    return item.id;
  }

  // Gestion des erreurs d'image
  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    target.src = 'assets/images/default.jpg'; // Remplacer par une image par défaut
  }
}
