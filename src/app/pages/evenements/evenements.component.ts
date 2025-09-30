import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { EvenementService, EvenementDTO } from '../../services/evenement.service';
import { AuthService } from '../../services/auth.service';
import { MembreService, Membre } from '../../services/membre.service';

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
  enfants: Membre[] = []; // Pour les parents
  membreSelectionne: Membre | null = null; // Pour inscription d'enfant

  constructor(
    private evenementService: EvenementService,
    private authService: AuthService,
    private membreService: MembreService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.detectUserContext();
    this.chargerEvenements();
  }

  private detectUserContext(): void {
    this.userRole = this.authService.getRole() || '';
    
    // Charger les enfants si c'est un parent
    if (this.userRole === 'PARENT') {
      this.membreService.getMembresPourParentConnecte().subscribe({
        next: (enfants) => {
          this.enfants = enfants || [];
        },
        error: (err) => {
          console.error('Erreur lors du chargement des enfants:', err);
          this.enfants = [];
        }
      });
    }
  }

  chargerEvenements(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.evenementService.getEvenementsActifs().subscribe({
      next: (data) => {
        this.evenements = data;
        this.isLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = 'Erreur lors du chargement des événements.';
        this.isLoading = false;
        console.error('Erreur événements:', err);
      }
    });
  }

  inscrire(evenement: EvenementDTO): void {
    if (!this.authService.isConnecte()) {
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

    // Si c'est un parent qui inscrit un enfant
    if (this.userRole === 'PARENT' && this.membreSelectionne) {
      console.log('🔍 Inscription enfant:', {
        evenementId,
        membreSelectionneId: this.membreSelectionne.id,
        userRole: this.userRole,
        commentaire: this.commentaire
      });

      this.evenementService
        .inscrireEnfantEvenement(evenementId, this.membreSelectionne.id, this.commentaire)
        .subscribe({
          next: (response) => {
            console.log('✅ Inscription réussie:', response);
            const prenomEnfant = this.membreSelectionne?.prenom || 'L\'enfant';
            this.successMessage = `${prenomEnfant} est inscrit(e) à cet événement 🎉`;
            this.fermerModal();
            this.chargerEvenements();
            this.clearMessages();
          },
          error: (err: HttpErrorResponse) => {
            console.error('❌ Erreur inscription:', err);
            console.error('❌ Détails erreur:', {
              status: err.status,
              statusText: err.statusText,
              error: err.error,
              message: err.message
            });
            this.errorMessage = this.getErrorMessage(err);
            this.isInscriptionLoading = false;
          },
          complete: () => {
            this.isInscriptionLoading = false;
          }
        });
    } else {
      // Inscription directe du membre connecté
      this.evenementService
        .inscrireMembreEvenement(evenementId, this.commentaire)
        .subscribe({
          next: () => {
            this.successMessage = 'Vous êtes inscrit à cet événement 🎉';
            this.fermerModal();
            this.chargerEvenements();
            this.clearMessages();
          },
          error: (err: HttpErrorResponse) => {
            this.errorMessage = this.getErrorMessage(err);
            this.isInscriptionLoading = false;
          },
          complete: () => {
            this.isInscriptionLoading = false;
          }
        });
    }
  }

  seDesinscrire(evenement: EvenementDTO): void {
    if (!confirm('Êtes-vous sûr de vouloir vous désinscrire de cet événement ?')) return;

    if (!evenement.inscriptionId) {
      this.errorMessage = 'Impossible de trouver votre inscription.';
      return;
    }
    
    // Utilise l'ID d'inscription pour la suppression (selon l'API backend)
    this.evenementService.desinscrireEvenement(evenement.inscriptionId).subscribe({
      next: () => {
        this.successMessage = 'Désinscription effectuée avec succès ✅';
        this.chargerEvenements();
        this.clearMessages();
      },
      error: (err: HttpErrorResponse) => {
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

  private getErrorMessage(error: HttpErrorResponse): string {
    console.log('🔍 Analyse erreur complète:', error);
    
    // 🔹 Erreur du backend avec message explicite
    if (error.error?.error) {
      return error.error.error;
    }
    if (error.error?.message) {
      return error.error.message;
    }
    
    // 🔹 Codes d'erreur spécifiques
    if (error.status === 409) return 'Vous êtes déjà inscrit à cet événement.';
    if (error.status === 400) {
      // Plus de détails pour debug
      console.log('🔍 Erreur 400 détaillée:', {
        error: error.error,
        message: error.message,
        url: error.url
      });
      return 'Données d\'inscription invalides. Vérifiez les informations saisies.';
    }
    if (error.status === 404) return 'Événement ou membre introuvable.';
    if (error.status === 403) return 'Vous n\'êtes pas autorisé à effectuer cette action.';
    
    return `Une erreur est survenue lors de l'inscription (${error.status}).`;
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

  onImageError(event: any): void {
    // Cache l'image en cas d'erreur de chargement
    event.target.style.display = 'none';
  }
}
