import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Importation de CommonModule

@Component({
  selector: 'app-actualites',
  standalone: true, // Indique que le composant est autonome
  imports: [CommonModule], // Ajout de CommonModule ici
  templateUrl: './actualites.component.html',
  styleUrls: ['./actualites.component.css']
})
export class ActualitesComponent {
  // Liste complète des actualités
  news = [
    { id: 1, title: 'Événement 1', category: 'evenement', content: 'Description de l\'événement 1' },
    { id: 2, title: 'Compétition 1', category: 'competition', content: 'Description de la compétition 1' },
    { id: 3, title: 'Annonce 1', category: 'annonce', content: 'Description de l\'annonce 1' },
    { id: 4, title: 'Événement 2', category: 'evenement', content: 'Description de l\'événement 2' },
    { id: 5, title: 'Compétition 2', category: 'competition', content: 'Description de la compétition 2' },
  ];

  // Liste des actualités affichées
  filteredNews = this.news.slice(0, 3); // Par défaut, afficher les 3 premières actualités

  // Charger toutes les actualités
  loadMore() {
    this.filteredNews = this.news;
  }

  // Réduire à 3 actualités
  loadLess() {
    this.filteredNews = this.news.slice(0, 3);
  }

  // Filtrer les actualités par catégorie
  filterNews(category: string) {
    if (category === 'all') {
      this.filteredNews = this.news;
    } else {
      this.filteredNews = this.news.filter(item => item.category === category);
    }
  }
}