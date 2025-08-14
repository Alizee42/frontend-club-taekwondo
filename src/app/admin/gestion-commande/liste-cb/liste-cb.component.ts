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
  commandesCB: CommandeDTO[] = [];   // Commandes payées par CB et non encore retirées
  isLoading = true;
  isUpdating = false;
  errorMessage = '';

  constructor(private commandeService: CommandeService) {}

  ngOnInit(): void {
    this.chargerCommandesCB();
  }

  /** 🔹 Charge les commandes payées par CB qui ne sont pas encore "RETIRE" */
  chargerCommandesCB(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.commandeService.getCommandes().subscribe({
      next: (commandes: any[]) => {
        // Normalise -> CommandeDTO
        const dtos = (commandes ?? []).map(c => this.toDTO(c));

        // Filtre: modePaiement = 'CB' ET statut != 'RETIRE'
        this.commandesCB = dtos.filter(c =>
          (c.modePaiement ?? '').toUpperCase() === 'CB' &&
          (c.statut ?? '').toUpperCase() !== 'RETIRE'
        );

        this.isLoading = false;
      },
      error: (err) => this.handleError('Erreur lors du chargement des commandes CB.', err)
    });
  }

  /** 🔹 Marque une commande comme "RETIRE" puis rafraîchit la liste */
  marquerCommeRetiree(id: number): void {
    this.isUpdating = true;
    this.commandeService.changerStatut(id, 'RETIRE').subscribe({
      next: () => {
        this.isUpdating = false;
        this.chargerCommandesCB();
      },
      error: (err) => this.handleError(`Erreur lors de la mise à jour du statut de la commande ${id}.`, err)
    });
  }

  /** 🔹 Format JJ/MM/AAAA */
  formatDateFR(dateStr?: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? '' : date.toLocaleDateString('fr-FR');
  }

  /** 🔧 Normalisation "any" -> CommandeDTO (évite les erreurs de type) */
  private toDTO(c: any): CommandeDTO {
    return {
      id: c?.id ?? 0,
      // essaie successivement plusieurs champs possibles pour la date
      dateCommande: c?.dateCommande ?? c?.datePaiement ?? c?.createdAt ?? '',
      montantTotal: c?.montantTotal ?? c?.total ?? 0,
      lignesCommande: c?.lignesCommande ?? c?.lignes ?? [],
      statut: c?.statut ?? 'EN_ATTENTE',
      modePaiement: c?.modePaiement ?? c?.paymentMode ?? ''
    };
  }

  /** ❗ Gestion erreurs */
  private handleError(message: string, error: any): void {
    console.error(message, error);
    this.errorMessage = message;
    this.isLoading = false;
    this.isUpdating = false;
  }
}
