import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EvenementService, EvenementDTO } from '../../services/evenement.service';

@Component({
  selector: 'app-evenements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './evenements.component.html',
  styleUrls: ['./evenements.component.css']
})
export class EvenementsComponent implements OnInit {
  evenements: EvenementDTO[] = [];
  isLoading = true;
  errorMessage = '';
  successMessage = '';
  
  // Modal d'inscription
  modalVisible = false;
  evenementSelectionne: EvenementDTO | null = null;
  commentaire: string = '';
  isInscriptionLoading = false;
  
  // Contexte utilisateur
  userRole = '';
  enfants: any[] = []; // Pour les parents
  membreSelectionne: any = null; // Pour inscription d'enfant

  constructor(
    private evenementService: EvenementService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.detectUserContext();
    this.chargerEvenements();
  }

  private detectUserContext(): void {
    this.userRole = localStorage.getItem('user_role') || '';
    // Pour l'instant, on simplifie sans charger les enfants
  }

  chargerEvenements(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.evenementService.getEvenementsActifs().subscribe({
      next: (data) => {
        this.evenements = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Erreur lors du chargement des événements.';
        this.isLoading = false;
        console.error('Erreur événements:', err);
      }
    });
  }

  inscrire(evenement: EvenementDTO): void {
    if (!localStorage.getItem('auth_token')) {
      this.router.navigate(['/connexion']);
      return;
    }

    this.evenementSelectionne = evenement;
    this.membreSelectionne = null;
    this.commentaire = '';
    this.modalVisible = true;
  }

  confirmerInscription(): void {
    if (!this.evenementSelectionne) return;

    this.isInscriptionLoading = true;
    this.errorMessage = '';

    const evenementId = this.evenementSelectionne.id;

    // Pour l'instant, inscription simple (membre)
    this.evenementService.inscrireMembreEvenement(evenementId, this.commentaire).subscribe({
      next: () => {
        this.successMessage = 'Vous êtes inscrit à cet événement !';
        this.fermerModal();
        this.chargerEvenements();
        this.clearMessages();
      },
      error: (err) => {
        this.errorMessage = this.getErrorMessage(err);
        this.isInscriptionLoading = false;
      },
      complete: () => {
        this.isInscriptionLoading = false;
      }
    });
  }

  seDesinscrire(evenement: EvenementDTO): void {
    if (!confirm('Êtes-vous sûr de vouloir vous désinscrire de cet événement ?')) {
      return;
    }

    this.evenementService.desinscrireEvenement(evenement.id).subscribe({
      next: () => {
        this.successMessage = 'Désinscription effectuée avec succès !';
        this.chargerEvenements();
        this.clearMessages();
      },
      error: (err) => {
        this.errorMessage = this.getErrorMessage(err);
      }
    });
  }

  fermerModal(): void {
    this.modalVisible = false;
    this.evenementSelectionne = null;
    this.membreSelectionne = null;
    this.commentaire = '';
    this.isInscriptionLoading = false;
  }

  private getErrorMessage(error: any): string {
    if (error.error?.message) {
      return error.error.message;
    }
    if (error.status === 409) {
      return 'Vous êtes déjà inscrit à cet événement.';
    }
    if (error.status === 400) {
      return 'Événement complet ou inscription fermée.';
    }
    return 'Une erreur est survenue lors de l\'inscription.';
  }

  // Utilitaires pour le template
  isEvenementComplet(evenement: EvenementDTO): boolean {
    return (evenement.nbInscrits || 0) >= evenement.capacite;
  }

  isEvenementPasse(evenement: EvenementDTO): boolean {
    return new Date(evenement.dateDebut) < new Date();
  }

  canInscribe(evenement: EvenementDTO): boolean {
    return !this.isEvenementComplet(evenement) && 
           !this.isEvenementPasse(evenement) && 
           !evenement.isInscrit;
  }

  clearMessages(): void {
    setTimeout(() => {
      this.successMessage = '';
      this.errorMessage = '';
    }, 5000);
  }

  trackByEvenement(index: number, evenement: EvenementDTO): number {
    return evenement.id;
  }
}
