import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EvenementService, EvenementDTO } from '../../services/evenement.service';
import { MembreService } from '../../services/membre.service';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';

interface Enfant {
  id: number;
  prenom: string;
  nom: string;
  dateNaissance: string;
  age?: number;
}

@Component({
  selector: 'app-evenements-parent',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, UiButtonComponent],
  templateUrl: './evenements-parent.component.html',
  styleUrls: ['./evenements-parent.component.css']
})
export class EvenementsParent implements OnInit {
  evenements: EvenementDTO[] = [];
  enfants: Enfant[] = [];
  enfantSelectionne: Enfant | null = null;
  inscriptionsEnfants: any[] = [];
  
  isLoading = false;
  errorMsg = '';
  isInscribing = false;
  successMsg = ''; // ✅ Ajout d'un message de succès

  constructor(
    private evenementService: EvenementService,
    private membreService: MembreService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.chargerDonnees();
  }

  // ✅ Méthode publique pour actualiser les données
  actualiserDonnees(): void {
    this.clearMessages();
    this.chargerDonnees();
  }

  // ✅ Méthode pour effacer les messages
  private clearMessages(): void {
    this.errorMsg = '';
    this.successMsg = '';
  }

  // ✅ Méthode pour afficher un message de succès temporaire
  private showSuccessMessage(message: string): void {
    this.successMsg = message;
    setTimeout(() => {
      this.successMsg = '';
    }, 3000); // Efface après 3 secondes
  }

  // ✅ Méthode pour effacer automatiquement les messages d'erreur
  private showErrorMessage(message: string): void {
    this.errorMsg = message;
    setTimeout(() => {
      this.errorMsg = '';
    }, 5000); // Efface après 5 secondes
  }

  chargerDonnees(): void {
    this.isLoading = true;
    this.errorMsg = '';
    
    // Charger les enfants et événements en parallèle
    Promise.all([
      this.chargerEnfants(),
      this.chargerEvenements(),
      this.chargerInscriptionsEnfants()
    ]).then(() => {
      this.isLoading = false;
      // Sélectionner automatiquement le premier enfant
      if (this.enfants.length > 0 && !this.enfantSelectionne) {
        this.enfantSelectionne = this.enfants[0];
      }
    }).catch((error) => {
      console.error('Erreur lors du chargement des données:', error);
      this.errorMsg = 'Impossible de charger les données. Veuillez réessayer.';
      this.isLoading = false;
    });
  }

  private chargerEnfants(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.membreService.getMembresPourParentConnecte().subscribe({
        next: (enfants: any) => {
          this.enfants = (enfants || []).map((e: any) => ({
            ...e,
            age: this.calculerAge(e.dateNaissance)
          }));
          resolve();
        },
        error: (error) => {
          console.warn('⚠️ Impossible de charger les enfants:', error);
          this.enfants = [];
          resolve(); // Continue même en cas d'erreur
        }
      });
    });
  }

  private chargerEvenements(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.evenementService.getEvenementsActifs().subscribe({
        next: (evenements) => {
          this.evenements = evenements || [];
          resolve();
        },
        error: (error) => {
          console.warn('⚠️ Impossible de charger les événements:', error);
          this.evenements = [];
          resolve(); // Continue même en cas d'erreur
        }
      });
    });
  }

  private chargerInscriptionsEnfants(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.evenementService.getInscriptionsEnfants().subscribe({
        next: (inscriptions) => {
          this.inscriptionsEnfants = inscriptions || [];
          console.log('✅ Inscriptions enfants chargées:', this.inscriptionsEnfants.length);
          resolve();
        },
        error: (error) => {
          console.warn('⚠️ Impossible de charger les inscriptions des enfants:', error);
          
          // ✅ Log détaillé de l'erreur pour debug
          if (error.status === 400) {
            console.warn('❌ Erreur 400 - Vérifiez l\'authentification ou les paramètres de la requête');
          } else if (error.status === 401) {
            console.warn('❌ Erreur 401 - Non autorisé, token invalide?');
          } else if (error.status === 403) {
            console.warn('❌ Erreur 403 - Accès interdit');
          }
          
          // On continue avec une liste vide plutôt que de faire planter l'app
          this.inscriptionsEnfants = [];
          resolve(); // resolve() au lieu de reject() pour ne pas bloquer le chargement
        }
      });
    });
  }

  selectionnerEnfant(enfant: Enfant): void {
    this.enfantSelectionne = enfant;
  }

  inscrireEnfant(evenement: EvenementDTO): void {
    if (!this.enfantSelectionne || this.isInscribing) return;
    
    // ✅ Validation supplémentaire
    if (!evenement.id || !this.enfantSelectionne.id) {
      console.error('❌ Données manquantes pour l\'inscription');
      this.showErrorMessage('Données manquantes pour l\'inscription');
      return;
    }

    // ✅ Vérification de la capacité
    if (this.isEvenementComplet(evenement)) {
      console.warn('❌ Événement complet, inscription impossible');
      this.showErrorMessage('Cet événement est complet');
      return;
    }

    // ✅ FORCER le rechargement des inscriptions AVANT de vérifier
    console.log('🔄 Rechargement préventif des inscriptions...');
    this.chargerInscriptionsEnfants().then(() => {
      // ✅ Vérification après rechargement
      if (this.isEnfantInscrit(evenement)) {
        console.warn('❌ Enfant déjà inscrit à cet événement (après rechargement)');
        this.showErrorMessage('Cet enfant est déjà inscrit à cet événement');
        return;
      }
      
      // ✅ Procéder à l'inscription
      this.procederInscription(evenement);
    }).catch(() => {
      // ✅ En cas d'erreur de rechargement, vérifier quand même localement
      if (this.isEnfantInscrit(evenement)) {
        console.warn('❌ Enfant déjà inscrit à cet événement (vérification locale)');
        this.showErrorMessage('Cet enfant est déjà inscrit à cet événement');
        return;
      }
      
      // ✅ Procéder à l'inscription
      this.procederInscription(evenement);
    });
  }
  
  private procederInscription(evenement: EvenementDTO): void {
    if (!this.enfantSelectionne) return;
    
    // ✅ Reset des erreurs précédentes
    this.errorMsg = '';
    this.isInscribing = true;
    
    console.log('🔄 Inscription en cours...', {
      evenementId: evenement.id,
      enfantId: this.enfantSelectionne.id,
      enfantNom: `${this.enfantSelectionne.prenom} ${this.enfantSelectionne.nom}`,
      evenementTitre: evenement.titre
    });
    
    this.evenementService.inscrireEnfantEvenement(evenement.id, this.enfantSelectionne.id).subscribe({
      next: (inscription) => {
        // ✅ Ajouter l'inscription à la liste locale
        if (inscription) {
          this.inscriptionsEnfants.push(inscription);
          console.log('✅ Inscription ajoutée localement:', inscription);
        }
        
        // ✅ Mettre à jour le compteur
        evenement.nbInscrits = (evenement.nbInscrits || 0) + 1;
        this.isInscribing = false;
        
        console.log('✅ Inscription réussie !', {
          inscription,
          nouveauNombreInscrits: evenement.nbInscrits
        });
        
        // ✅ Afficher un message de succès
        if (this.enfantSelectionne) {
          this.showSuccessMessage(`${this.enfantSelectionne.prenom} a été inscrit(e) à l'événement "${evenement.titre}"`);
        }
      },
      error: (error: any) => {
        console.error('❌ Erreur lors de l\'inscription:', error);
        
        // ✅ Gestion d'erreur détaillée avec extraction du message backend
        let errorMessage = 'Erreur lors de l\'inscription';
        
        if (error.error) {
          if (typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.error.error) {
            errorMessage = error.error.error;
          } else if (error.error.message) {
            errorMessage = error.error.message;
          }
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        // ✅ Messages d'erreur spécifiques selon le code de statut
        if (error.status === 400) {
          // ✅ Traitement spécial pour les contraintes de doublon
          if (errorMessage.includes('Duplicate entry') || errorMessage.includes('déjà inscrit')) {
            errorMessage = 'Cet enfant est déjà inscrit à cet événement';
            
            // ✅ FORCER le rechargement complet des données
            console.log('🔄 Désynchronisation détectée, rechargement forcé...');
            this.chargerInscriptionsEnfants().then(() => {
              console.log('🔄 Inscriptions rechargées après détection de doublon côté serveur');
            });
          } else {
            errorMessage = 'Données d\'inscription invalides. ' + errorMessage;
          }
        } else if (error.status === 401) {
          errorMessage = 'Vous n\'êtes pas autorisé à effectuer cette action';
        } else if (error.status === 403) {
          errorMessage = 'Accès interdit pour cette inscription';
        } else if (error.status === 409) {
          errorMessage = 'Cet enfant est déjà inscrit à cet événement';
        }
        
        // ✅ Afficher l'erreur à l'utilisateur avec effacement automatique
        this.showErrorMessage(errorMessage);
        this.isInscribing = false;
        
        console.log('🔍 Détails complets de l\'erreur:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          errorBody: error.error,
          fullError: error
        });
        
        // ✅ Toujours recharger les données après une erreur pour éviter les désynchronisations
        setTimeout(() => {
          this.chargerInscriptionsEnfants().then(() => {
            console.log('🔄 Inscriptions rechargées après erreur');
          });
        }, 1000);
      }
    });
  }

  desinscrireEnfant(evenement: EvenementDTO): void {
    if (!this.enfantSelectionne || this.isInscribing) return;
    
    // ✅ Trouver l'inscription de l'enfant pour cet événement
    const inscription = this.inscriptionsEnfants.find(
      i => i.evenementId === evenement.id && 
           i.membreId === this.enfantSelectionne?.id &&
           i.statut !== 'ANNULEE'
    );
    
    if (!inscription) {
      console.warn('❌ Aucune inscription trouvée pour cet enfant et cet événement');
      this.showErrorMessage('Aucune inscription trouvée pour cet enfant');
      
      // ✅ Forcer le rechargement des inscriptions en cas de désynchronisation
      this.chargerInscriptionsEnfants().then(() => {
        console.log('🔄 Inscriptions rechargées après recherche d\'inscription inexistante');
      });
      return;
    }
    
    // ✅ Reset des erreurs précédentes
    this.errorMsg = '';
    this.isInscribing = true;
    
    console.log('🔄 Désinscription en cours...', {
      inscriptionId: inscription.id,
      evenementId: evenement.id,
      enfantId: this.enfantSelectionne.id,
      enfantNom: `${this.enfantSelectionne.prenom} ${this.enfantSelectionne.nom}`,
      evenementTitre: evenement.titre
    });
    
    this.evenementService.desinscrireEvenement(inscription.id).subscribe({
      next: () => {
        // ✅ DOUBLE SUPPRESSION pour garantir la cohérence
        // 1. Suppression par index
        const indexToRemove = this.inscriptionsEnfants.findIndex(
          i => i.evenementId === evenement.id && i.membreId === this.enfantSelectionne?.id
        );
        
        if (indexToRemove > -1) {
          this.inscriptionsEnfants.splice(indexToRemove, 1);
          console.log('✅ Inscription supprimée par index:', indexToRemove);
        }
        
        // 2. Suppression par filtre pour éliminer tout résidu
        this.inscriptionsEnfants = this.inscriptionsEnfants.filter(
          i => !(i.evenementId === evenement.id && i.membreId === this.enfantSelectionne?.id)
        );
        
        // ✅ Mettre à jour le compteur
        evenement.nbInscrits = Math.max((evenement.nbInscrits || 1) - 1, 0);
        this.isInscribing = false;
        
        console.log('✅ Désinscription réussie !', {
          evenementId: evenement.id,
          nouveauNombreInscrits: evenement.nbInscrits,
          inscriptionsRestantes: this.inscriptionsEnfants.length,
          enfantEstEncoreInscrit: this.isEnfantInscrit(evenement)
        });
        
        // ✅ Afficher un message de succès
        if (this.enfantSelectionne) {
          this.showSuccessMessage(`${this.enfantSelectionne.prenom} a été désinscrit(e) de l'événement "${evenement.titre}"`);
        }
        
        // ✅ PAS de rechargement immédiat pour éviter la race condition
        // On fait confiance à la mise à jour locale
        console.log('� État après désinscription - enfant encore inscrit?', this.isEnfantInscrit(evenement));
      },
      error: (error: any) => {
        console.error('❌ Erreur lors de la désinscription:', error);
        
        // ✅ Gestion d'erreur pour la désinscription
        let errorMessage = 'Erreur lors de la désinscription';
        
        if (error.error) {
          if (typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.error.error) {
            errorMessage = error.error.error;
          } else if (error.error.message) {
            errorMessage = error.error.message;
          }
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        // ✅ Messages d'erreur spécifiques
        if (error.status === 404) {
          errorMessage = 'Inscription non trouvée';
        } else if (error.status === 401) {
          errorMessage = 'Vous n\'êtes pas autorisé à effectuer cette action';
        } else if (error.status === 403) {
          errorMessage = 'Accès interdit pour cette désinscription';
        }
        
        this.showErrorMessage(errorMessage);
        this.isInscribing = false;
        
        console.log('🔍 Détails de l\'erreur de désinscription:', {
          status: error.status,
          errorBody: error.error,
          inscriptionId: inscription.id
        });
        
        // ✅ Recharger les données après erreur pour éviter la désynchronisation
        setTimeout(() => {
          this.chargerInscriptionsEnfants().then(() => {
            console.log('🔄 Inscriptions rechargées après erreur de désinscription');
          });
        }, 1000);
      }
    });
  }

  isEnfantInscrit(evenement: EvenementDTO): boolean {
    if (!this.enfantSelectionne) {
      console.log('🔍 isEnfantInscrit: Aucun enfant sélectionné');
      return false;
    }
    
    // ✅ Vérification stricte des inscriptions
    const inscription = this.inscriptionsEnfants.find(
      i => i.evenementId === evenement.id && 
           i.membreId === this.enfantSelectionne?.id &&
           i.statut && i.statut !== 'ANNULEE' // ✅ Exclure les inscriptions annulées
    );
    
    const isInscrit = !!inscription;
    
    // ✅ Logs détaillés pour le débogage
    console.log('🔍 Vérification inscription:', {
      enfantId: this.enfantSelectionne.id,
      enfantNom: `${this.enfantSelectionne.prenom} ${this.enfantSelectionne.nom}`,
      evenementId: evenement.id,
      evenementTitre: evenement.titre,
      inscriptionTrouvee: inscription,
      inscriptionId: inscription?.id,
      inscriptionStatut: inscription?.statut,
      isInscrit,
      totalInscriptions: this.inscriptionsEnfants.length,
      toutesLesInscriptionsPourCetEvenement: this.inscriptionsEnfants
        .filter(i => i.evenementId === evenement.id)
        .map(i => ({ id: i.id, membreId: i.membreId, statut: i.statut }))
    });
    
    return isInscrit;
  }

  isEvenementComplet(evenement: EvenementDTO): boolean {
    if (!evenement.capacite || evenement.capacite <= 0) return false;
    return (evenement.nbInscrits || 0) >= evenement.capacite;
  }

  calculerAge(dateNaissance: string): number {
    const aujourdhui = new Date();
    const naissance = new Date(dateNaissance);
    let age = aujourdhui.getFullYear() - naissance.getFullYear();
    const mois = aujourdhui.getMonth() - naissance.getMonth();
    
    if (mois < 0 || (mois === 0 && aujourdhui.getDate() < naissance.getDate())) {
      age--;
    }
    
    return age;
  }

  formatDateRange(dateDebut: string, dateFin: string): string {
    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);
    
    const optionsDate: Intl.DateTimeFormatOptions = { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    };
    
    const optionsHeure: Intl.DateTimeFormatOptions = { 
      hour: '2-digit', 
      minute: '2-digit' 
    };
    
    if (debut.toDateString() === fin.toDateString()) {
      return `${debut.toLocaleDateString('fr-FR', optionsDate)} de ${debut.toLocaleTimeString('fr-FR', optionsHeure)} à ${fin.toLocaleTimeString('fr-FR', optionsHeure)}`;
    } else {
      return `Du ${debut.toLocaleDateString('fr-FR', optionsDate)} au ${fin.toLocaleDateString('fr-FR', optionsDate)}`;
    }
  }

  trackByEvenement(index: number, evenement: EvenementDTO): number {
    return evenement.id;
  }

  onImageError(event: any): void {
    event.target.src = '/assets/images/default-event.jpg';
  }

  allerVersEnfants(): void {
    this.router.navigate(['/parent/enfants']);
  }

  // Méthodes pour le tableau récapitulatif
  getInscriptionsAvecDetails(): any[] {
    const inscriptionsDetails: any[] = [];
    
    this.inscriptionsEnfants.forEach(inscription => {
      const enfant = this.enfants.find(e => e.id === inscription.membreId);
      const evenement = this.evenements.find(ev => ev.id === inscription.evenementId);
      
      if (enfant && evenement) {
        inscriptionsDetails.push({
          id: inscription.id,
          enfant: enfant,
          evenement: evenement,
          inscription: inscription
        });
      }
    });
    
    return inscriptionsDetails;
  }

  trackByInscription(index: number, item: any): any {
    return item.id || item.inscription?.id || index;
  }

  formatDateCourt(dateDebut: string, dateFin: string): string {
    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);
    
    const optionsDate: Intl.DateTimeFormatOptions = { 
      day: 'numeric', 
      month: 'short'
    };
    
    if (debut.toDateString() === fin.toDateString()) {
      return debut.toLocaleDateString('fr-FR', optionsDate);
    } else {
      return `${debut.toLocaleDateString('fr-FR', optionsDate)} - ${fin.toLocaleDateString('fr-FR', optionsDate)}`;
    }
  }

  desinscrireEnfantDuTableau(inscriptionDetail: any): void {
    if (this.isInscribing) return;
    
    this.isInscribing = true;
    
    this.evenementService.desinscrireEvenement(inscriptionDetail.inscription.id).subscribe({
      next: () => {
        // Retirer l'inscription de la liste
        this.inscriptionsEnfants = this.inscriptionsEnfants.filter(
          i => i.id !== inscriptionDetail.inscription.id
        );
        
        // Mettre à jour le compteur de l'événement
        const evenement = this.evenements.find(e => e.id === inscriptionDetail.evenement.id);
        if (evenement) {
          evenement.nbInscrits = Math.max((evenement.nbInscrits || 1) - 1, 0);
        }
        
        this.isInscribing = false;
        console.log('✅ Désinscription réussie !');
      },
      error: (error: any) => {
        console.error('❌ Erreur lors de la désinscription:', error);
        this.isInscribing = false;
      }
    });
  }
}
