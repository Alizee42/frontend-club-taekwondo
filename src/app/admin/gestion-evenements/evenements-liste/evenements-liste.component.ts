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
  filterActif: 'tous' | 'actifs' | 'inactifs' = 'tous';
  sortBy: 'dateDebut' | 'titre' | 'lieu' = 'dateDebut';
  sortOrder: 'asc' | 'desc' = 'asc';

  // ✅ Données du formulaire
  nouvelEvenement = {
    titre: '',
    description: '',
    dateDebut: '',
    dateFin: '',
    lieu: '',
    capacite: 0,
    actif: true,
    imageFile: null as File | null,
    imageUrl: '' // utilisé pour l’aperçu et l’affichage dans le tableau
  };

  constructor(private evenementService: EvenementService) {}

  ngOnInit(): void {
    this.chargerEvenements();
  }

  // ======================== CHARGEMENT ========================
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

  // ======================== FILTRES & TRI ========================
  appliquerFiltres(): void {
    let filtered = [...this.evenements];

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(e =>
        e.titre.toLowerCase().includes(term) ||
        e.description.toLowerCase().includes(term) ||
        e.lieu.toLowerCase().includes(term)
      );
    }

    if (this.filterActif !== 'tous') {
      filtered = filtered.filter(e =>
        this.filterActif === 'actifs' ? e.actif : !e.actif
      );
    }

    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (this.sortBy) {
        case 'titre': aValue = a.titre.toLowerCase(); bValue = b.titre.toLowerCase(); break;
        case 'lieu': aValue = a.lieu.toLowerCase(); bValue = b.lieu.toLowerCase(); break;
        default: aValue = new Date(a.dateDebut).getTime(); bValue = new Date(b.dateDebut).getTime();
      }

      if (aValue < bValue) return this.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    this.filteredEvenements = filtered;
  }

  // ======================== MODAL ========================
  ouvrirModal(): void {
    this.resetFormulaire();
    this.isEditing = false;
    this.modalVisible = true;
  }

  ouvrirModalModification(evenement: EvenementDTO): void {
    this.isEditing = true;
    this.editingEventId = evenement.id;
    this.nouvelEvenement = {
      titre: evenement.titre,
      description: evenement.description,
      dateDebut: this.formatDateForInput(evenement.dateDebut),
      dateFin: this.formatDateForInput(evenement.dateFin),
      lieu: evenement.lieu,
      capacite: evenement.capacite,
      actif: evenement.actif,
      imageFile: null,
      imageUrl: evenement.imageUrl ?? '' // affichera l'image existante
    };
    this.modalVisible = true;
  }

  fermerModal(): void {
    this.modalVisible = false;
    this.resetFormulaire();
    this.clearMessages();
  }

  resetFormulaire(): void {
    this.nouvelEvenement = {
      titre: '',
      description: '',
      dateDebut: '',
      dateFin: '',
      lieu: '',
      capacite: 0,
      actif: true,
      imageFile: null,
      imageUrl: ''
    };
    this.editingEventId = 0;
  }

  // ======================== FICHIERS ========================
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        this.errorMsg = 'Veuillez sélectionner un fichier image valide.'; return;
      }
      if (file.size > 5 * 1024 * 1024) {
        this.errorMsg = 'L\'image ne doit pas dépasser 5MB.'; return;
      }

      this.nouvelEvenement.imageFile = file;

      // ✅ Générer un aperçu immédiat (base64)
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.nouvelEvenement.imageUrl = e.target.result;
      };
      reader.readAsDataURL(file);

      this.clearMessages();
    }
  }

  // ======================== CRUD ========================
  ajouterEvenement(): void {
    if (!this.validerFormulaire()) return;

    this.isLoading = true;
    this.clearMessages();

    const formData = new FormData();
    formData.append('titre', this.nouvelEvenement.titre);
    formData.append('description', this.nouvelEvenement.description);
    formData.append('dateDebut', this.nouvelEvenement.dateDebut);
    formData.append('dateFin', this.nouvelEvenement.dateFin);
    formData.append('lieu', this.nouvelEvenement.lieu);
    formData.append('capacite', this.nouvelEvenement.capacite.toString());
    formData.append('actif', this.nouvelEvenement.actif.toString());

    if (this.nouvelEvenement.imageFile) {
      formData.append('image', this.nouvelEvenement.imageFile);
    }

    const operation$ = this.isEditing
      ? this.evenementService.modifierEvenement(this.editingEventId, formData)
      : this.evenementService.ajouterEvenement(formData);

    operation$.subscribe({
      next: (eventCree) => {
        this.successMsg = `Événement ${this.isEditing ? 'modifié' : 'ajouté'} avec succès !`;

        // ⚡ Si le backend renvoie un chemin d'image → mettre à jour
        if (eventCree.imageUrl) {
          this.nouvelEvenement.imageUrl = eventCree.imageUrl;
        }

        this.chargerEvenements();
        this.fermerModal();
        this.isLoading = false;
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
        setTimeout(() => this.clearMessages(), 3000);
      },
      error: (error) => {
        console.error('Erreur lors de la suppression:', error);
        let errorMessage = 'Erreur lors de la suppression de l\'événement.';
        
        if (error.status === 400) {
          errorMessage = 'Impossible de supprimer cet événement. Il peut avoir des inscriptions ou des contraintes.';
        } else if (error.status === 404) {
          errorMessage = 'Événement introuvable.';
        }
        
        this.errorMsg = errorMessage;
        setTimeout(() => this.clearMessages(), 5000);
      }
    });
  }

  toggleActifEvenement(evenement: EvenementDTO): void {
    this.evenementService.changerStatutEvenement(evenement.id, !evenement.actif).subscribe({
      next: () => {
        evenement.actif = !evenement.actif;
        this.successMsg = `Événement ${evenement.actif ? 'activé' : 'désactivé'} !`;
        setTimeout(() => this.clearMessages(), 2000);
      },
      error: (error: any) => {
        console.error('Erreur lors de la modification du statut:', error);
        this.errorMsg = 'Erreur lors de la modification du statut.';
      }
    });
  }

  // ======================== VALIDATION ========================
  validerFormulaire(): boolean {
    if (!this.nouvelEvenement.titre.trim()) { this.errorMsg = 'Le titre est requis.'; return false; }
    if (!this.nouvelEvenement.dateDebut) { this.errorMsg = 'La date de début est requise.'; return false; }
    if (!this.nouvelEvenement.dateFin) { this.errorMsg = 'La date de fin est requise.'; return false; }
    if (new Date(this.nouvelEvenement.dateDebut) >= new Date(this.nouvelEvenement.dateFin)) {
      this.errorMsg = 'La date de fin doit être postérieure à la date de début.'; return false;
    }
    if (this.nouvelEvenement.capacite < 1) { this.errorMsg = 'La capacité doit être d\'au moins 1.'; return false; }
    return true;
  }

  // ======================== UTILITAIRES ========================
  formatDateForInput(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date
      .getDate().toString().padStart(2, '0')}T${date.getHours().toString().padStart(2, '0')}:${date
      .getMinutes().toString().padStart(2, '0')}`;
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  clearMessages(): void {
    this.errorMsg = '';
    this.successMsg = '';
  }

  getSortIcon(field: 'dateDebut' | 'titre' | 'lieu'): string {
    if (this.sortBy !== field) return 'ri-sort-desc';
    return this.sortOrder === 'asc' ? 'ri-sort-asc' : 'ri-sort-desc';
  }
}
