import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // Import ajouté
import { FormsModule } from '@angular/forms'; // Import ajouté
import { InscriptionsService } from '../../../services/inscriptions.service';
import { EvenementService } from '../../../services/evenement.service';

@Component({
  selector: 'app-inscriptions',
  standalone: true,
  imports: [CommonModule, FormsModule], // Correction : Ajout des imports nécessaires
  templateUrl: './inscriptions.component.html',
  styleUrls: ['./inscriptions.component.css']
})
export class InscriptionsComponent implements OnInit {
  evenements: any[] = []; // Liste des événements
  evenementSelectionneId: number | null = null; // ID de l'événement sélectionné
  inscriptionsEnAttente: any[] = []; // Inscriptions en attente
  inscriptionsValidees: any[] = []; // Inscriptions validées

  constructor(
    private inscriptionsService: InscriptionsService,
    private evenementService: EvenementService
  ) {}

  ngOnInit(): void {
    this.chargerEvenements();
  }

  // 🔹 Charger tous les événements pour le dropdown
  chargerEvenements(): void {
    this.evenementService.getAllEvenements().subscribe({ // Correction : Utilisation de `getAllEvenements`
      next: (data: any[]) => { // Correction : Typage explicite de `data`
        this.evenements = data;
      },
      error: (err: any) => { // Correction : Typage explicite de `err`
        console.error('Erreur lors du chargement des événements :', err);
      }
    });
  }

  // 🔹 Charger les inscriptions pour l'événement sélectionné
  chargerInscriptions(): void {
    if (!this.evenementSelectionneId) return;

    this.inscriptionsService.getInscriptionsByEvenement(this.evenementSelectionneId).subscribe({ // Correction : Suppression du deuxième argument
      next: (data: any[]) => { // Correction : Typage explicite de `data`
        this.inscriptionsEnAttente = data.filter(inscrit => inscrit.statut === 'EN_ATTENTE');
        this.inscriptionsValidees = data.filter(inscrit => inscrit.statut === 'VALIDEE');
      },
      error: (err: any) => { // Correction : Typage explicite de `err`
        console.error('Erreur lors du chargement des inscriptions :', err);
      }
    });
  }

  // 🔹 Valider une inscription
  validerInscription(id: number): void {
    this.inscriptionsService.updateStatut(id, 'VALIDEE').subscribe({ // Correction : Utilisation de `updateStatut`
      next: () => {
        alert('Inscription validée avec succès.');
        this.chargerInscriptions(); // Recharger les inscriptions
      },
      error: (err: any) => { // Correction : Typage explicite de `err`
        console.error('Erreur lors de la validation de l\'inscription :', err);
        alert('Une erreur est survenue lors de la validation.');
      }
    });
  }

  // 🔹 Refuser une inscription
  refuserInscription(id: number): void {
    this.inscriptionsService.updateStatut(id, 'REFUSEE').subscribe({ // Correction : Utilisation de `updateStatut`
      next: () => {
        alert('Inscription refusée avec succès.');
        this.chargerInscriptions(); // Recharger les inscriptions
      },
      error: (err: any) => { // Correction : Typage explicite de `err`
        console.error('Erreur lors du refus de l\'inscription :', err);
        alert('Une erreur est survenue lors du refus.');
      }
    });
  }
}