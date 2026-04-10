import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActualiteService } from '../../services/actualite.service';
import { AuthService } from '../../services/auth.service';

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

  // Ajout des propriétés nécessaires pour la compilation et les filtres
  clubIdSelectionne: number | null = null;
  typeFilter: string = '';
  featuredOnly: boolean = false;

  actualites: Actualite[] = [];
  featuredNews: Actualite | null = null;
  imageUrl: string | ArrayBuffer | null = null;
  imageError: string = '';
  searchTerm: string = '';
  isModalOpen = false;
  actualite: Actualite;

  columns = [
    { key: 'titre', label: 'Titre', class: 'col-titre' },
    { key: 'typeActu', label: 'Type', class: 'col-type' },
    { key: 'datePublication', label: 'Date', class: 'col-date', format: (row: Actualite) => row.datePublication ? new Date(row.datePublication).toLocaleDateString('fr-FR') : '' },
    { key: 'imageUrl', label: 'Image', class: 'col-img', format: (row: Actualite) => row.imageUrl ? `<img src='${row.imageUrl}' style='max-width:70px;max-height:50px;border-radius:6px;'/>` : '' },
    { key: 'isFeatured', label: 'À la une', class: 'col-featured', format: (row: Actualite) => row.isFeatured ? '🌟 À la une' : '' },
  ];

  actions = [
    { action: 'edit', label: 'Éditer', icon: 'ri-edit-line', color: 'primary' },
    { action: 'delete', label: 'Supprimer', icon: 'ri-delete-bin-line', color: 'danger' },
    { action: 'feature', label: 'Mettre à la une', icon: 'ri-star-line', color: 'warning', show: (row: Actualite) => !row.isFeatured }
  ];

  fields = [
    { name: 'titre', label: 'Titre', type: 'text', required: true, placeholder: 'Titre de l\'actualité' },
    { name: 'typeActu', label: 'Type', type: 'select', required: true, options: [
      { value: 'evenement', label: 'Événement' },
      { value: 'competition', label: 'Compétition' },
      { value: 'annonce', label: 'Annonce' }
    ] },
    { name: 'contenu', label: 'Contenu', type: 'textarea', required: true, placeholder: 'Contenu de l\'actualité' },
    { name: 'image', label: 'Image', type: 'file', required: false, onChange: this.onImageSelected.bind(this) }
  ];

  onTableAction(event: { action: string, row: Actualite }) {
    if (event.action === 'edit') {
      this.editActualite(event.row);
    } else if (event.action === 'delete') {
      this.deleteActualite(event.row.id!);
    } else if (event.action === 'feature') {
      this.setFeatured(event.row);
    }
  }

  constructor(private actualiteService: ActualiteService, private authService: AuthService) {
    this.actualite = this.getEmptyActualite();
  }

  ngOnInit(): void {
    this.loadActualites();
  }

  /** Récupère le clubId de l'utilisateur connecté */
  private getClubId(): number | null {
    const utilisateur = this.authService.getUtilisateurConnecte() as any;
    if (!utilisateur) return null;
    return utilisateur?.club?.id ?? utilisateur?.clubId
      ?? (Array.isArray(utilisateur?.clubs) && utilisateur.clubs[0]?.id ? utilisateur.clubs[0].id : null);
  }

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

  loadActualites() {
    const clubId = this.getClubId();
    if (!clubId) return;
    this.actualiteService.getActualitesByClub(clubId).subscribe({
      next: (data: Actualite[]) => {
        this.actualites = data;
        this.updateFeaturedNews();
      },
      error: () => {
        this.actualites = [];
      }
    });
  }

  updateFeaturedNews(): void {
    if (!Array.isArray(this.actualites)) {
      this.featuredNews = null;
      return;
    }
    this.featuredNews = this.actualites.find((item: Actualite) => item.isFeatured === true) || null;
  }

  openModal(actu?: Actualite): void {
    this.actualite = actu ? { ...actu } : this.getEmptyActualite();
    this.imageUrl = actu?.imageUrl || null;
    this.imageError = '';
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.resetForm();
  }

  resetForm(): void {
    this.actualite = this.getEmptyActualite();
    this.imageUrl = null;
    this.imageError = '';
  }

  onSubmit(): void {
    this.actualite.datePublication = new Date().toISOString();
    if (!this.actualite.id) {
      this.actualite.clubId = this.getClubId() ?? undefined;
    }
    const request$ = this.actualite.id
      ? this.actualiteService.update(this.actualite.id, this.actualite)
      : this.actualiteService.create(this.actualite);
    request$.subscribe(() => {
      this.loadActualites();
      this.closeModal();
    });
  }

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

  deleteActualite(id: string): void {
    if (confirm('Voulez-vous vraiment supprimer cette actualité ?')) {
      this.actualiteService.delete(id).subscribe(() => {
        this.loadActualites();
      });
    }
  }

  setFeatured(actu: Actualite): void {
    if (this.featuredNews && this.featuredNews.id === actu.id) {
      alert('Cette actualité est déjà mise à la une.');
      return;
    }
    this.actualiteService.setFeatured(actu).subscribe({
      next: () => {
        this.loadActualites();
      },
      error: (err) => {
        console.error('❌ Erreur lors de la mise à la une :', err);
        alert('Une erreur est survenue lors de la mise à la une.');
      }
    });
  }

  filteredActualites(): Actualite[] {
    const term = this.searchTerm.trim().toLowerCase();
    // Filtre d'abord par club sélectionné (comparaison en string)
    let filtered = this.actualites.filter(actu => String(actu.clubId) === String(this.clubIdSelectionne));
    // Puis filtre par recherche texte
    if (term) {
      filtered = filtered.filter(actu =>
        actu.titre.toLowerCase().includes(term) ||
        actu.typeActu.toLowerCase().includes(term) ||
        actu.contenu.toLowerCase().includes(term)
      );
    }
    // Filtre type
    if (this.typeFilter) {
      filtered = filtered.filter(actu => actu.typeActu === this.typeFilter);
    }
    // Filtre "à la une"
    if (this.featuredOnly) {
      filtered = filtered.filter(actu => actu.isFeatured === true);
    }
    return filtered;
  }

  editActualite(actu: Actualite): void {
    this.openModal(actu);
  }
}