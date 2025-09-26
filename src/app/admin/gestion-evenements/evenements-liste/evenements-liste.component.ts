import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EvenementService, EvenementDTO } from '../../../services/evenement.service';

@Component({
  selector: 'app-evenements-liste',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './evenements-liste.component.html',
  styleUrls: ['./evenements-liste.component.css']
})
export class EvenementsListeComponent implements OnInit {
  evenements: EvenementDTO[] = [];
  filteredEvenements: EvenementDTO[] = [];
  
  // Modal et formulaire
  modalVisible = false;
  isEditing = false;
  editingEventId = 0;
  isLoading = false;
  errorMsg = '';
  successMsg = '';
  
  // Filtres et recherche
  searchTerm = '';
  filterActif = 'tous'; // tous, actifs, inactifs
  sortBy = 'dateDebut'; // dateDebut, titre, lieu
  sortOrder = 'asc'; // asc, desc

  // Formulaire événement
  newEvent = {
    titre: '',
    description: '',
    dateDebut: '',
    dateFin: '',
    lieu: '',
    capacite: 0,
    actif: true,
    imageFile: null as File | null
  };

  constructor(private evenementService: EvenementService) {}

  ngOnInit(): void {
    this.chargerEvenements();
  }

  // ======================== CHARGEMENT DONNÉES ========================

  chargerEvenements(): void {
    this.isLoading = true;
    this.errorMsg = '';
    
    this.evenementService.getAllEvenements().subscribe({
      next: (evenements) => {
        this.evenements = evenements;
        this.appliquerFiltres();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des événements:', error);
        this.errorMsg = 'Impossible de charger les événements.';
        this.isLoading = false;
      }
    });
  }

  // ======================== FILTRES ET TRI ========================

  appliquerFiltres(): void {
    let filtered = [...this.evenements];

    // Recherche textuelle
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(e => 
        e.titre.toLowerCase().includes(term) ||
        e.description.toLowerCase().includes(term) ||
        e.lieu.toLowerCase().includes(term)
      );
    }

    // Filtre par statut actif
    if (this.filterActif !== 'tous') {
      filtered = filtered.filter(e => 
        this.filterActif === 'actifs' ? e.actif : !e.actif
      );
    }

    // Tri
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (this.sortBy) {
        case 'titre':
          aValue = a.titre.toLowerCase();
          bValue = b.titre.toLowerCase();
          break;
        case 'lieu':
          aValue = a.lieu.toLowerCase();
          bValue = b.lieu.toLowerCase();
          break;
        case 'dateDebut':
        default:
          aValue = new Date(a.dateDebut);
          bValue = new Date(b.dateDebut);
          break;
      }

      if (aValue < bValue) return this.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    this.filteredEvenements = filtered;
  }

  onSearchChange(): void {
    this.appliquerFiltres();
  }

  onFilterChange(): void {
    this.appliquerFiltres();
  }

  changerTri(field: string): void {
    if (this.sortBy === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortOrder = 'asc';
    }
    this.appliquerFiltres();
  }

  // ======================== MODAL GESTION ========================

  ouvrirModal(): void {
    this.resetFormulaire();
    this.isEditing = false;
    this.modalVisible = true;
  }

  ouvrirModalModification(evenement: EvenementDTO): void {
    this.isEditing = true;
    this.editingEventId = evenement.id;
    this.newEvent = {
      titre: evenement.titre,
      description: evenement.description,
      dateDebut: this.formatDateForInput(evenement.dateDebut),
      dateFin: this.formatDateForInput(evenement.dateFin),
      lieu: evenement.lieu,
      capacite: evenement.capacite,
      actif: evenement.actif,
      imageFile: null
    };
    this.modalVisible = true;
  }

  fermerModal(): void {
    this.modalVisible = false;
    this.resetFormulaire();
    this.clearMessages();
  }

  resetFormulaire(): void {
    this.newEvent = {
      titre: '',
      description: '',
      dateDebut: '',
      dateFin: '',
      lieu: '',
      capacite: 0,
      actif: true,
      imageFile: null
    };
    this.editingEventId = 0;
  }

  // ======================== GESTION FICHIERS ========================

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Vérification du type de fichier
      if (!file.type.startsWith('image/')) {
        this.errorMsg = 'Veuillez sélectionner un fichier image valide.';
        return;
      }
      
      // Vérification de la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.errorMsg = 'L\'image ne doit pas dépasser 5MB.';
        return;
      }
      
      this.newEvent.imageFile = file;
      this.clearMessages();
    }
  }

  // ======================== CRUD ÉVÉNEMENTS ========================

  ajouterOuModifierEvenement(): void {
    if (!this.validerFormulaire()) return;

    this.isLoading = true;
    this.clearMessages();

    const formData = new FormData();
    formData.append('titre', this.newEvent.titre);
    formData.append('description', this.newEvent.description);
    formData.append('dateDebut', this.newEvent.dateDebut);
    formData.append('dateFin', this.newEvent.dateFin);
    formData.append('lieu', this.newEvent.lieu);
    formData.append('capacite', this.newEvent.capacite.toString());
    formData.append('actif', this.newEvent.actif.toString());

    if (this.newEvent.imageFile) {
      formData.append('image', this.newEvent.imageFile);
    }

    const operation$ = this.isEditing 
      ? this.evenementService.modifierEvenement(this.editingEventId, formData)
      : this.evenementService.ajouterEvenement(formData);

    operation$.subscribe({
      next: () => {
        this.successMsg = `Événement ${this.isEditing ? 'modifié' : 'ajouté'} avec succès !`;
        this.chargerEvenements();
        this.fermerModal();
        this.isLoading = false;
        
        // Auto-clear success message
        setTimeout(() => this.clearMessages(), 3000);
      },
      error: (error) => {
        console.error('Erreur lors de la sauvegarde:', error);
        this.errorMsg = `Erreur lors de la ${this.isEditing ? 'modification' : 'création'} de l'événement.`;
        this.isLoading = false;
      }
    });
  }

  supprimerEvenement(id: number): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) return;

    this.evenementService.supprimerEvenement(id).subscribe({
      next: () => {
        this.successMsg = 'Événement supprimé avec succès !';
        this.chargerEvenements();
        
        // Auto-clear success message
        setTimeout(() => this.clearMessages(), 3000);
      },
      error: (error) => {
        console.error('Erreur lors de la suppression:', error);
        this.errorMsg = 'Erreur lors de la suppression de l\'événement.';
      }
    });
  }

  toggleActifEvenement(evenement: EvenementDTO): void {
    // Utiliser l'API spécifique pour changer le statut (JSON au lieu de FormData)
    this.evenementService.changerStatutEvenement(evenement.id, !evenement.actif).subscribe({
      next: () => {
        evenement.actif = !evenement.actif;
        this.successMsg = `Événement ${evenement.actif ? 'activé' : 'désactivé'} !`;
        
        // Auto-clear success message
        setTimeout(() => this.clearMessages(), 2000);
      },
      error: (error: any) => {
        console.error('Erreur lors de la modification du statut:', error);
        this.errorMsg = 'Erreur lors de la modification du statut.';
      }
    });
  }

  // ======================== VALIDATION ET UTILITAIRES ========================

  validerFormulaire(): boolean {
    if (!this.newEvent.titre.trim()) {
      this.errorMsg = 'Le titre est requis.';
      return false;
    }
    
    if (!this.newEvent.dateDebut) {
      this.errorMsg = 'La date de début est requise.';
      return false;
    }
    
    if (!this.newEvent.dateFin) {
      this.errorMsg = 'La date de fin est requise.';
      return false;
    }
    
    if (new Date(this.newEvent.dateDebut) >= new Date(this.newEvent.dateFin)) {
      this.errorMsg = 'La date de fin doit être postérieure à la date de début.';
      return false;
    }
    
    if (this.newEvent.capacite < 1) {
      this.errorMsg = 'La capacité doit être d\'au moins 1 personne.';
      return false;
    }
    
    return true;
  }

  formatDateForInput(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  clearMessages(): void {
    this.errorMsg = '';
    this.successMsg = '';
  }

  getSortIcon(field: string): string {
    if (this.sortBy !== field) return 'ri-sort-desc';
    return this.sortOrder === 'asc' ? 'ri-sort-asc' : 'ri-sort-desc';
  }
}