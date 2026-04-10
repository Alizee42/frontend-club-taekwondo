import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgFor, DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommandeService, CommandeDTO } from '../../services/commande.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-commandes-membre',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgIf, NgFor,
    DatePipe, CurrencyPipe
  ],
  templateUrl: './commandes-membre.component.html',
  styleUrls: ['./commandes-membre.component.css']
})
export class CommandesMembreComponent implements OnInit {

  commandes: CommandeDTO[] = [];
  isLoading = false;
  errorMsg = '';
  search = '';

  constructor(private commandeService: CommandeService, private authService: AuthService) {}

  private getCurrentMembreId(): number | null {
    const membreId = this.authService.getMembreIdFromToken() ?? this.authService.getUserIdFromToken();
    return membreId && membreId > 0 ? membreId : null;
  }

  /** =========================
   *   Cycle de vie
   * ========================= */
  ngOnInit(): void {
    this.chargerCommandes();
  }

  /** =========================
   *   Chargement des commandes
   * ========================= */
  chargerCommandes(): void {
    this.isLoading = true;
    this.errorMsg = '';

    const mid = this.getCurrentMembreId();
    if (!mid) {
      this.errorMsg = 'Membre non identifié.';
      this.isLoading = false;
      return;
    }

    this.commandeService.getCommandesMembre(mid).subscribe({
      next: (list) => {
        this.commandes = list
          .sort((a, b) =>
            new Date(b.dateCommande).getTime() - new Date(a.dateCommande).getTime()
          );
        this.isLoading = false;
      },
      error: (err) => {
        console.error('[Commandes Membre] erreur API', err);
        this.errorMsg = 'Impossible de charger vos commandes.';
        this.isLoading = false;
      }
    });
  }

  /** =========================
   *   UI Helpers
   * ========================= */
  articlesResume(c: CommandeDTO): string {
    const lignes = c?.lignes ?? [];
    if (!lignes.length) return '—';
    const count = lignes.reduce((sum, l) => sum + (Number(l.quantite) || 0), 0);
    const noms = Array.from(new Set(lignes.map(l => l.produitNom || 'Produit').filter(Boolean)));
    const preview = noms.slice(0, 2).join(', ');
    const more = noms.length > 2 ? ` (+${noms.length - 2})` : '';
    return `${count} article${count > 1 ? 's' : ''} • ${preview}${more}`;
  }

  trackByCommande = (_: number, c: CommandeDTO) => c.id;

  // Détails commande
  commandeSelectionnee: CommandeDTO | null = null;
  voirDetails(c: CommandeDTO) { this.commandeSelectionnee = c; }
  fermerDetails() { this.commandeSelectionnee = null; }

  classeBadgeCommande(statut: string): string {
    const s = (statut || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    if (s.includes('paye')) return 'badge badge-success';
    if (s.includes('attente')) return 'badge badge-warning';
    if (s.includes('retire')) return 'badge badge-secondary';
    if (s.includes('annule')) return 'badge badge-danger';
    return 'badge badge-dark';
  }
}
