import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EvenementService, EvenementDTO } from '../../services/evenement.service';
import { MembreService } from '../../services/membre.service';

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
  imports: [CommonModule, FormsModule],
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

  constructor(
    private evenementService: EvenementService,
    private membreService: MembreService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.chargerDonnees();
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
        error: reject
      });
    });
  }

  private chargerEvenements(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.evenementService.getEvenementsActifs().subscribe({
        next: (evenements) => {
          this.evenements = evenements;
          resolve();
        },
        error: reject
      });
    });
  }

  private chargerInscriptionsEnfants(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.evenementService.getInscriptionsEnfants().subscribe({
        next: (inscriptions) => {
          this.inscriptionsEnfants = inscriptions;
          resolve();
        },
        error: reject
      });
    });
  }

  selectionnerEnfant(enfant: Enfant): void {
    this.enfantSelectionne = enfant;
  }

  inscrireEnfant(evenement: EvenementDTO): void {
    if (!this.enfantSelectionne || this.isInscribing) return;
    
    this.isInscribing = true;
    
    this.evenementService.inscrireEnfantEvenement(evenement.id, this.enfantSelectionne.id).subscribe({
      next: (inscription) => {
        // Ajouter l'inscription à la liste
        this.inscriptionsEnfants.push(inscription);
        evenement.nbInscrits = (evenement.nbInscrits || 0) + 1;
        this.isInscribing = false;
        console.log('✅ Inscription réussie !');
      },
      error: (error: any) => {
        console.error('❌ Erreur lors de l\'inscription:', error);
        this.isInscribing = false;
      }
    });
  }

  desinscrireEnfant(evenement: EvenementDTO): void {
    if (!this.enfantSelectionne || this.isInscribing) return;
    
    // Trouver l'inscription de l'enfant pour cet événement
    const inscription = this.inscriptionsEnfants.find(
      i => i.evenementId === evenement.id && i.membreId === this.enfantSelectionne?.id
    );
    
    if (!inscription) {
      console.warn('Aucune inscription trouvée pour cet enfant et cet événement');
      return;
    }
    
    this.isInscribing = true;
    
    this.evenementService.desinscrireEvenement(inscription.id).subscribe({
      next: () => {
        // Retirer l'inscription de la liste
        this.inscriptionsEnfants = this.inscriptionsEnfants.filter(
          i => !(i.evenementId === evenement.id && i.membreId === this.enfantSelectionne?.id)
        );
        evenement.nbInscrits = Math.max((evenement.nbInscrits || 1) - 1, 0);
        this.isInscribing = false;
        console.log('✅ Désinscription réussie !');
      },
      error: (error: any) => {
        console.error('❌ Erreur lors de la désinscription:', error);
        this.isInscribing = false;
      }
    });
  }

  isEnfantInscrit(evenement: EvenementDTO): boolean {
    if (!this.enfantSelectionne) return false;
    
    return this.inscriptionsEnfants.some(
      i => i.evenementId === evenement.id && i.membreId === this.enfantSelectionne?.id
    );
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
}