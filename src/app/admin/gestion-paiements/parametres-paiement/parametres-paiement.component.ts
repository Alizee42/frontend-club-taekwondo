import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParametresPaiement } from '../../../models/parametres-paiement';
import { ParametresPaiementService } from '../../../services/parametres-paiement.service';

@Component({
  selector: 'app-parametres-paiement',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './parametres-paiement.component.html',
  styleUrls: ['./parametres-paiement.component.css']
})
export class ParametresPaiementComponent implements OnInit {
  parametres: ParametresPaiement = {
    montantCotisation: 0,
    virement: false,
    especes: false,
    stripe: false,
    modePaiementParDefaut: 'virement',
    echeancesAutorisees: 2,
    intervalleEcheance: '1mois'
  };

  intervallesDisponibles = [
    { libelle: 'Toutes les 3 semaines', valeur: '3semaines' },
    { libelle: 'Tous les mois', valeur: '1mois' },
    { libelle: 'Tous les 2 mois', valeur: '2mois' }
  ];

  showModal: boolean = false;
  messageModal: string = '';

  constructor(private parametresService: ParametresPaiementService) {}

  ngOnInit(): void {
    this.parametresService.chargerParametres();
    this.parametresService.parametres$.subscribe(p => {
      if (p) {
        this.parametres = {
          montantCotisation: p.montantCotisation ?? 0,
          virement: p.virement ?? false,
          especes: p.especes ?? false,
          stripe: p.stripe ?? false,
          modePaiementParDefaut: p.modePaiementParDefaut ?? '',
          echeancesAutorisees: p.echeancesAutorisees ?? 1,
          intervalleEcheance: p.intervalleEcheance ?? ''
        };
      }
    });
  }

    enregistrerParametres(): void {
    if (!this.parametres || this.parametres.montantCotisation <= 0) {
      this.afficherModal('❌ Le montant de la cotisation doit être supérieur à 0.');
      return;
    }
  
    this.parametresService.sauvegarder(this.parametres).subscribe({
      next: () => {
        this.afficherModal('✅ Paramètres enregistrés avec succès !');
      },
      error: () => {
        // Ne pas afficher la modale en cas d'erreur
        console.error('Erreur lors de la sauvegarde des paramètres.');
      }
    });
  }
  
  afficherModal(message: string): void {
    this.messageModal = message;
    this.showModal = true;
  
    // Fermer la modale automatiquement après 5 secondes
    setTimeout(() => {
      this.fermerModal();
    }, 5000);
  }
  
  fermerModal(): void {
    this.showModal = false;
    this.messageModal = '';
  }
}
