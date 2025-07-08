import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommandeService } from '../../../services/commande.service';
import { CommandeDTO } from '../../../models/commande';

@Component({
  selector: 'app-liste-cb',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './liste-cb.component.html',
  styleUrls: ['./liste-cb.component.css']
})
export class ListeCbComponent implements OnInit {
  commandesCB: CommandeDTO[] = [];        // Commandes payées par CB et non encore retirées
  isLoading: boolean = true;              // Indicateur de chargement
  isUpdating: boolean = false;            // Indicateur de mise à jour
  errorMessage: string = '';              // Message d'erreur

  constructor(private commandeService: CommandeService) {}

  ngOnInit(): void {
    this.chargerCommandesCB();
  }

  // 🔹 Charger les commandes CB qui ne sont pas encore retirées
  chargerCommandesCB(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.commandeService.getCommandes().subscribe({
      next: (commandes: CommandeDTO[]) => {
        this.commandesCB = commandes.filter(
          commande => commande.modePaiement === 'CB' && commande.statut !== 'RETIRE'
        );
        this.isLoading = false;
      },
      error: (err) => {
        this.handleError('Erreur lors du chargement des commandes CB.', err);
      }
    });
  }

  // 🔹 Marquer une commande comme "RETIRE"
  marquerCommeRetiree(id: number): void {
      console.log(`Tentative de marquer la commande ${id} comme retirée`);
      this.commandeService.changerStatut(id, 'RETIRE').subscribe({
        next: () => {
          console.log(`Commande ${id} marquée comme retirée avec succès`);
          this.chargerCommandesCB(); // Rafraîchir la liste des commandes
        },
        error: (err) => {
          console.error(`Erreur lors de la mise à jour du statut de la commande ${id}`, err);
        }
      });
    }

  // 🔹 Format de date FR (JJ/MM/AAAA)
  formatDateFR(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR');
  }

  // 🔹 Gestion d'erreurs centralisée
  private handleError(message: string, error: any): void {
    console.error(message, error);
    this.errorMessage = message;
    this.isLoading = false;
    this.isUpdating = false;
  }
}
