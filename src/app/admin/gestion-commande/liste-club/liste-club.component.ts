import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommandeService } from '../../../services/commande.service';

@Component({
  selector: 'app-liste-club',
  standalone: true,
  templateUrl: './liste-club.component.html',
  styleUrls: ['./liste-club.component.css'],
  imports: [CommonModule, FormsModule]  // ✅ Ajout de CommonModule et FormsModule
})
export class ListeClubComponent implements OnInit {
  commandes: any[] = [];
  isLoading = false;
  errorMessage = '';
  modalVisible = false;
  commandeActuelle: any = null;

  paiementForm = {
    mode: '',
    date: '',
    justificatif: null
  };

  constructor(private commandeService: CommandeService) {}

  ngOnInit(): void {
    this.chargerCommandes();
  }

  chargerCommandes(): void {
    this.isLoading = true;
    this.commandeService.getCommandesPaiementClub().subscribe({
      next: (data) => {
        this.commandes = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Erreur lors du chargement des commandes';
        this.isLoading = false;
      }
    });
  }

  ouvrirModalPaiement(commande: any): void {
    this.commandeActuelle = commande;
    this.modalVisible = true;
  }

  fermerModal(): void {
    this.modalVisible = false;
    this.paiementForm = { mode: '', date: '', justificatif: null };
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    this.paiementForm.justificatif = file;
  }

  validerPaiement(): void {
    if (!this.commandeActuelle) return;

    this.commandeService.validerPaiementManuel(
      this.commandeActuelle.id,
      this.paiementForm.mode,
      this.paiementForm.date
      // + justificatif si tu veux l’envoyer plus tard
    ).subscribe({
      next: () => {
        this.fermerModal();
        this.chargerCommandes();
      },
      error: () => {
        alert("Erreur lors de l'enregistrement du paiement.");
      }
    });
  }
}
