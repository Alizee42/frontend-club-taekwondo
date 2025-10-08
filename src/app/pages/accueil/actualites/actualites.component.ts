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
    this.loadActualitesClub();
  }

  /** 🔄 Charge les actualités du club de l'utilisateur connecté */
  loadActualitesClub(): void {
    const utilisateur = JSON.parse(localStorage.getItem('utilisateur') || '{}');
    console.log('Utilisateur localStorage:', utilisateur);
    let clubId: number | null = null;
    if (utilisateur?.club?.id) {
      clubId = utilisateur.club.id;
    } else if (utilisateur?.clubId) {
      clubId = utilisateur.clubId;
    } else if (Array.isArray(utilisateur?.clubs) && utilisateur.clubs.length > 0 && utilisateur.clubs[0]?.id) {
      clubId = utilisateur.clubs[0].id;
    }
    if (!clubId) {
      console.error('Impossible de récupérer le club de l’utilisateur connecté. Structure utilisateur:', utilisateur);
      return;
    }
    this.actualiteService.getActualitesByClub(clubId).subscribe({
      next: (data) => {
        this.news = Array.isArray(data) ? data : [];
        this.updateFeaturedNews();
        this.updateRegularNews();
        this.updateFilteredNews();
      },
      error: (err) => {
        this.news = [];
        console.error('Erreur de chargement des actualités du club :', err);
      }
    });
  }

  /** 🌟 Met à jour l'actualité mise à la une */
  updateFeaturedNews(): void {
    if (!Array.isArray(this.news)) {
      this.featuredNews = null;
      return;
    }
    this.featuredNews = this.news.find(item => item.isFeatured) || null;
    if (this.featuredNews) {
    } else {
    }
  }

  /** 🔄 Met à jour les actualités régulières */
  updateRegularNews(): void {
    this.regularNews = this.news.filter(item => !item.isFeatured);
  
    // Si une seule actualité régulière, appliquer une classe spécifique
    if (this.regularNews.length === 1) {
      document.querySelector('.actu-grid')?.classList.add('single-card');
    } else {
      document.querySelector('.actu-grid')?.classList.remove('single-card');
    }
  }

  /** 🔄 Met à jour les actualités filtrées pour la pagination */
  updateFilteredNews(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.filteredNews = this.regularNews.slice(start, end);
  }

  /** ➕ Charge plus d'actualités */
  loadMore(): void {
    this.currentPage++;
    this.updateFilteredNews();
  }

  /** ➖ Réinitialise la pagination */
  loadLess(): void {
    this.currentPage = 1;
    this.updateFilteredNews();
  }

  /** 🔍 Suivi des actualités par ID */
  trackById(index: number, item: any): any {
    return item.id;
  }

  /** 🖼️ Gestion des erreurs d'image */
  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    target.src = 'assets/images/default.jpg';
  }
}