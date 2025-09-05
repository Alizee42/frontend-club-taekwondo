import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActualiteService } from '../../services/actualite.service';

interface Actualite {
  id?: string;
  titre: string;
  contenu: string;
  typeActu: string;
  datePublication: string;
  isFeatured?: boolean;
  imageUrl?: string;
}

@Component({
  selector: 'app-gestion-actualites',
  standalone: true,
  templateUrl: './gestion-actualites.component.html',
  styleUrls: ['./gestion-actualites.component.css'],
  imports: [CommonModule, FormsModule]
})
export class GestionActualitesComponent implements OnInit {

  actualites: Actualite[] = [];
  featuredNews: Actualite | null = null;
  imageUrl: string | ArrayBuffer | null = null;
  imageError: string = '';
  searchTerm: string = '';
  isModalOpen = false;

  actualite: Actualite = this.getEmptyActualite();

  constructor(private actualiteService: ActualiteService) {}

  ngOnInit(): void {
    this.loadActualites();
  }

  loadActualites(): void {
    this.actualiteService.getAll().subscribe({
      next: (data: Actualite[]) => {
        this.actualites = data;
  
        // Vérifiez si une actualité a isFeatured: true
        const featured = this.actualites.find(actu => actu.isFeatured === true);
        if (featured) {
        } else {
        }
  
        this.updateFeaturedNews(); // Met à jour l'actualité mise à la une
      },
      error: (err) => {
        console.error('❌ Erreur lors du chargement des actualités :', err);
        alert('Impossible de charger les actualités. Veuillez réessayer.');
      }
    });
  }

  /** 🌟 Met à jour l'actualité mise à la une */
  updateFeaturedNews(): void {
    this.featuredNews = this.actualites.find((item: Actualite) => item.isFeatured === true) || null;
  
    if (this.featuredNews) {
    } else {
    }
  }

  /** 🆕 Retourne une actualité vide */
  private getEmptyActualite(): Actualite {
    return {
      titre: '',
      contenu: '',
      typeActu: '',
      datePublication: new Date().toISOString(),
      isFeatured: false,
      imageUrl: ''
    };
  }

  /** 🪟 Ouvre la modale (édition ou création) */
  openModal(actu?: Actualite): void {
    this.actualite = actu ? { ...actu } : this.getEmptyActualite();
    this.imageUrl = actu?.imageUrl || null;
    this.imageError = '';
    this.isModalOpen = true;
  }

  /** ❌ Ferme la modale */
  closeModal(): void {
    this.isModalOpen = false;
    this.resetForm();
  }

  /** 🧼 Réinitialise le formulaire */
  resetForm(): void {
    this.actualite = this.getEmptyActualite();
    this.imageUrl = null;
    this.imageError = '';
  }

  /** 💾 Soumet le formulaire (création ou mise à jour) */
  onSubmit(): void {
    this.actualite.datePublication = new Date().toISOString();

    const request$ = this.actualite.id
      ? this.actualiteService.update(this.actualite.id, this.actualite)
      : this.actualiteService.create(this.actualite);

    request$.subscribe(() => {
      this.loadActualites();
      this.closeModal();
    });
  }

  /** 🖼️ Gestion de l'image sélectionnée */
  onImageSelected(event: any): void {
    const file = event.target.files[0];
    if (!file || !file.type.startsWith('image/')) {
      this.imageError = 'Veuillez sélectionner une image valide.';
      this.imageUrl = null;
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.imageUrl = reader.result;
      this.actualite.imageUrl = this.imageUrl as string;
      this.imageError = '';
    };
    reader.readAsDataURL(file);
  }

  /** 🗑️ Supprime une actualité */
  deleteActualite(id: string): void {
    if (confirm('Voulez-vous vraiment supprimer cette actualité ?')) {
      this.actualiteService.delete(id).subscribe(() => {
        this.loadActualites();
      });
    }
  }

  /** 🌟 Définit une actualité comme "À la une" */
  setFeatured(actu: Actualite): void {
    if (this.featuredNews && this.featuredNews.id === actu.id) {
      alert('Cette actualité est déjà mise à la une.');
      return;
    }
  
    this.actualiteService.setFeatured(actu).subscribe({
      next: () => {
        this.loadActualites(); // Recharge les actualités après la mise à jour
      },
      error: (err) => {
        console.error('❌ Erreur lors de la mise à la une :', err);
        alert('Une erreur est survenue lors de la mise à la une.');
      }
    });
  }

  /** 🔍 Filtrage */
  filteredActualites(): Actualite[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.actualites;

    return this.actualites.filter(actu =>
      actu.titre.toLowerCase().includes(term) ||
      actu.typeActu.toLowerCase().includes(term)
    );
  }

  /** ✏️ Remplit le formulaire pour édition */
  editActualite(actu: Actualite): void {
    this.openModal(actu);
  }
}