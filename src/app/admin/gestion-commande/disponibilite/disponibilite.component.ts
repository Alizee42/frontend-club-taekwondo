import { Component, OnInit } from '@angular/core';
import { CommandeService } from '../../../services/commande.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-disponibilite',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './disponibilite.component.html',
  styleUrls: ['./disponibilite.component.css']
})
export class DisponibiliteComponent implements OnInit {
  commandesEnCours: any[] = [];
  commandesRetirees: any[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';

  constructor(private commandeService: CommandeService) {}

  ngOnInit(): void {
    this.actualiserListe();
  }

  // 🔁 Rafraîchir les deux listes
  actualiserListe(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.commandeService.getCommandes().subscribe({
      next: (data) => {
        this.commandesEnCours = data.filter(c =>
          c.statut === 'EN_COURS' || c.statut === 'DISPONIBLE' || c.statut === 'PAYEE'
        );
        this.commandesRetirees = data.filter(c => c.statut === 'RETIRE');
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = "Erreur lors du chargement des commandes.";
        this.isLoading = false;
      }
    });
  }

  // 📦 Marquer une commande comme disponible
  marquerCommeDisponible(id: number): void {
    this.commandeService.updateCommande(id, {
      statut: 'DISPONIBLE',
      modePaiement: ''
    }).subscribe({
      next: () => this.actualiserListe(),
      error: () => this.errorMessage = "Impossible de marquer la commande comme disponible."
    });
  }

  // ✅ Marquer une commande comme retirée
  marquerCommeRetiree(id: number): void {
    this.commandeService.updateCommande(id, {
      statut: 'RETIRE',
      modePaiement: ''
    }).subscribe({
      next: () => this.actualiserListe(),
      error: () => this.errorMessage = "Impossible de marquer la commande comme retirée."
    });
  }
}
