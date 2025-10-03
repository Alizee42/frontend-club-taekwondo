import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EvenementService, EvenementDTO, InscriptionEvenementDTO } from '../../services/evenement.service';
import { InscriptionsService, Inscription } from '../../services/inscriptions.service';

@Component({
  selector: 'app-gestion-evenements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-evenements.component.html',
  styleUrls: ['./gestion-evenements.component.css']
})
export class GestionEvenementsComponent implements OnInit {
  // Résumés pour la section inscription admin
  get nbInscritsAttente(): number {
    return this.inscriptions.filter(i => i.statut === 'EN_ATTENTE').length;
  }
  get nbInscritsValide(): number {
    return this.inscriptions.filter(i => i.statut === 'VALIDEE').length;
  }
  get nbInscritsRefuse(): number {
    return this.inscriptions.filter(i => i.statut === 'REFUSEE').length;
  }
  // Dashboard synthétique
  totalInscrits = 0;
  prochainEvenementTitre = '-';
  evenements: EvenementDTO[] = [];
  inscriptions: Inscription[] = [];
  evenementSelectionne: EvenementDTO | null = null;

  // Modal et formulaire
  afficherFormulaire = false;
  isEditing = false;
  editingEventId = 0;
  nouvelEvenement = {
    titre: '',
    description: '',
    dateDebut: '',
    dateFin: '',
    lieu: '',
    capacite: 0,
    actif: true,
    imageFile: null as File | null,
    imageUrl: ''
  };

  // Messages et états
  errorMsg = '';
  successMsg = '';
  isLoading = false;

  // Tri
  sortBy: 'dateDebut' | 'titre' = 'dateDebut';
  sortOrder: 'asc' | 'desc' = 'asc';

  constructor(
    private evenementService: EvenementService,
    private inscriptionsService: InscriptionsService
  ) {}

  ngOnInit(): void {
    this.chargerEvenements();
  }

  // ======================== EVENEMENTS ========================
  chargerEvenements(): void {
    this.isLoading = true;
    this.evenementService.getAllEvenements().subscribe({
      next: (evenements) => {
        this.evenements = evenements;
        this.trier(this.sortBy);
        // Calcul dashboard
        this.totalInscrits = this.evenements.reduce((acc, e) => acc + (e.nbInscrits || 0), 0);
        // Prochain événement (dateDebut future la plus proche)
        const now = new Date();
        const futurs = this.evenements.filter(e => new Date(e.dateDebut) > now);
        if (futurs.length > 0) {
          const prochain = futurs.reduce((prev, curr) => new Date(prev.dateDebut) < new Date(curr.dateDebut) ? prev : curr);
          this.prochainEvenementTitre = prochain.titre;
        } else {
          this.prochainEvenementTitre = '-';
        }
        this.isLoading = false;
      },
      error: () => {
        this.errorMsg = 'Erreur lors du chargement des événements.';
        this.isLoading = false;
      }
    });
  }

  ouvrirFormulaireCreation() {
    this.afficherFormulaire = true;
    this.isEditing = false;
    this.resetFormulaire();
  }

  ouvrirEdition(evt: EvenementDTO) {
    this.afficherFormulaire = true;
    this.isEditing = true;
    this.editingEventId = evt.id;
    this.nouvelEvenement = {
      titre: evt.titre,
      description: evt.description,
      dateDebut: this.formatDateForInput(evt.dateDebut),
      dateFin: this.formatDateForInput(evt.dateFin),
      lieu: evt.lieu,
      capacite: evt.capacite,
      actif: evt.actif,
      imageFile: null,
      imageUrl: evt.imageUrl || ''
    };
  }

  fermerFormulaire() {
    this.afficherFormulaire = false;
    this.resetFormulaire();
    this.clearMessages();
  }

  resetFormulaire() {
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
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.nouvelEvenement.imageUrl = e.target.result;
      };
      reader.readAsDataURL(file);
      this.clearMessages();
    }
  }

  soumettreEvenement(): void {
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
        this.successMsg = `Événement ${this.isEditing ? 'modifié' : 'créé'} avec succès !`;
        this.chargerEvenements();
        this.fermerFormulaire();
        this.isLoading = false;
        setTimeout(() => this.clearMessages(), 3000);
      },
      error: () => {
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
      error: () => {
        this.errorMsg = 'Erreur lors de la suppression de l\'événement.';
        setTimeout(() => this.clearMessages(), 5000);
      }
    });
  }

  trier(field: 'dateDebut' | 'titre') {
    if (this.sortBy === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortOrder = 'asc';
    }
    this.evenements.sort((a, b) => {
      let aValue: any, bValue: any;
      if (field === 'titre') {
        aValue = a.titre.toLowerCase();
        bValue = b.titre.toLowerCase();
      } else {
        aValue = new Date(a.dateDebut).getTime();
        bValue = new Date(b.dateDebut).getTime();
      }
      if (aValue < bValue) return this.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }

  getSortIcon(field: 'dateDebut' | 'titre'): string {
    if (this.sortBy !== field) return 'ri-sort-desc';
    return this.sortOrder === 'asc' ? 'ri-sort-asc' : 'ri-sort-desc';
  }

  // ======================== INSCRIPTIONS ========================
  selectionnerEvenement(evt: EvenementDTO) {
    this.evenementSelectionne = evt;
    this.chargerInscriptions(evt.id);
  }

  chargerInscriptions(evenementId: number) {
    this.inscriptionsService.getInscriptionsByEvenement(evenementId).subscribe({
      next: (data) => {
        this.inscriptions = data;
      },
      error: () => {
        this.inscriptions = [];
      }
    });
  }

  validerInscription(inscrit: Inscription) {
    this.inscriptionsService.updateStatut(inscrit.id!, 'VALIDEE').subscribe({
      next: () => {
        this.chargerInscriptions(this.evenementSelectionne!.id);
      }
    });
  }

  refuserInscription(inscrit: Inscription) {
    this.inscriptionsService.updateStatut(inscrit.id!, 'REFUSEE').subscribe({
      next: () => {
        this.chargerInscriptions(this.evenementSelectionne!.id);
      }
    });
  }

  fermerInscriptions() {
    this.evenementSelectionne = null;
    this.inscriptions = [];
  }

  // ======================== UTILITAIRES ========================
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

  formatDateForInput(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date
      .getDate().toString().padStart(2, '0')}T${date.getHours().toString().padStart(2, '0')}:${date
      .getMinutes().toString().padStart(2, '0')}`;
  }

  clearMessages(): void {
    this.errorMsg = '';
    this.successMsg = '';
  }
}