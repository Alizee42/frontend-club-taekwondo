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
  clubId?: number;
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
  clubIdSelectionne: number | null = null;
  clubs: Array<{ id: number; nom: string }> = [
    { id: 1, nom: 'Club 1' },
    { id: 2, nom: 'Club 2' },
    { id: 3, nom: 'Club 3' },
    { id: 4, nom: 'Club 4' }
  ];
  actualite: Actualite = {
    titre: '',
    contenu: '',
    typeActu: '',
    datePublication: new Date().toISOString(),
    isFeatured: false,
    imageUrl: '',
    clubId: undefined
  };

  /** Récupère le clubId de l'utilisateur connecté */
  private getClubId(): number | null {
    const utilisateur = JSON.parse(localStorage.getItem('utilisateur') || '{}');
    if (utilisateur?.club?.id) {
      return utilisateur.club.id;
    } else if (utilisateur?.clubId) {
      return utilisateur.clubId;
    } else if (Array.isArray(utilisateur?.clubs) && utilisateur.clubs.length > 0 && utilisateur.clubs[0]?.id) {
      return utilisateur.clubs[0].id;
    }
    return null;
  }

  constructor(private actualiteService: ActualiteService) {}

  ngOnInit(): void {
  // Initialisation club sélectionné à celui de l'utilisateur connecté
  this.clubIdSelectionne = this.getClubId();
  this.loadActualitesClub();
  }

  loadActualites(): void {
  // Ancienne méthode, non utilisée
  // this.actualiteService.getAll().subscribe({ ... });
  }

  /** Charge les actualités du club sélectionné */
  loadActualitesClub(): void {
    if (!this.clubIdSelectionne) return;
    this.actualiteService.getActualitesByClub(this.clubIdSelectionne).subscribe({
      next: (data: Actualite[]) => {
        this.actualites = Array.isArray(data) ? data : [];
        this.updateFeaturedNews();
      },
      error: (err) => {
        this.actualites = [];
        console.error('❌ Erreur lors du chargement des actualités du club :', err);
        alert('Impossible de charger les actualités du club.');
      }
    });
  }

  /** Changement de club dans le select */
  onClubChange(): void {
    this.loadActualitesClub();
  }

  /** 🌟 Met à jour l'actualité mise à la une */
  updateFeaturedNews(): void {
    if (!Array.isArray(this.actualites)) {
      this.featuredNews = null;
      return;
    }
    this.featuredNews = this.actualites.find((item: Actualite) => item.isFeatured === true) || null;
    if (this.featuredNews) {
    } else {
    }
  }

  /** 🆕 Retourne une actualité vide */
  private getEmptyActualite(): Actualite {
    const clubId = this.getClubId();
    return {
      titre: '',
      contenu: '',
      typeActu: '',
      datePublication: new Date().toISOString(),
      isFeatured: false,
      imageUrl: '',
      clubId: clubId ?? undefined
    };
  }
  /** Crée une actualité en ajoutant le clubId automatiquement */
  createActualite(): void {
    // Utilise le club sélectionné
    if (!this.clubIdSelectionne) {
      alert('Veuillez sélectionner un club.');
      return;
    }
    const actualiteToCreate = { ...this.actualite, clubId: this.clubIdSelectionne };
    this.actualiteService.create(actualiteToCreate).subscribe({
      next: () => {
        this.loadActualitesClub();
        this.actualite = this.getEmptyActualite();
        alert('Actualité créée avec succès !');
      },
      error: (err) => {
        console.error('Erreur lors de la création de l’actualité :', err);
        alert('Impossible de créer l’actualité.');
      }
    });
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
    // Toujours inclure le club sélectionné lors de la création
    if (!this.actualite.id) {
      if (!this.clubIdSelectionne) {
        alert('Veuillez sélectionner un club.');
        return;
      }
      this.actualite.clubId = this.clubIdSelectionne;
    }
    const request$ = this.actualite.id
      ? this.actualiteService.update(this.actualite.id, this.actualite)
      : this.actualiteService.create(this.actualite);

    request$.subscribe(() => {
      this.loadActualitesClub();
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
        this.loadActualitesClub();
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
        this.loadActualitesClub(); // Recharge les actualités après la mise à jour
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
    // Filtre d'abord par club sélectionné (comparaison en string)
    let filtered = this.actualites.filter(actu => String(actu.clubId) === String(this.clubIdSelectionne));
    // Puis filtre par recherche texte
    if (term) {
      filtered = filtered.filter(actu =>
        actu.titre.toLowerCase().includes(term) ||
        actu.typeActu.toLowerCase().includes(term)
      );
    }
    return filtered;
  }

  /** ✏️ Remplit le formulaire pour édition */
  editActualite(actu: Actualite): void {
  this.openModal(actu);
  }
}