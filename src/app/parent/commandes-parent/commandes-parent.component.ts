import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommandeService, CommandeDTO } from '../../services/commande.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-commandes-parent',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './commandes-parent.component.html',
  styleUrls: ['./commandes-parent.component.css']
})
export class CommandesParentComponent implements OnInit {

  commandes: CommandeDTO[] = [];
  isLoading = false;
  errorMsg = '';
  search = '';

  constructor(
    private commandeService: CommandeService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.chargerCommandes();
  }

  /** =========================
   *   ID utilisateur
   * ========================= */
  private getCurrentUserId(): number | null {
    const utilisateurId =
      this.authService.getUtilisateurConnecte()?.id ??
      this.authService.getUserIdFromToken();

    if (utilisateurId && utilisateurId > 0) {
      return utilisateurId;
    }

    console.warn('[CommandesParent] Aucun utilisateurId valide trouve');
    return null;
  }

  /** =========================
   *   Chargement des commandes
   * ========================= */
  chargerCommandes(): void {
    this.isLoading = true;
    this.errorMsg = '';

    const parentId = this.getCurrentUserId();
    if (!parentId) {
      this.errorMsg = 'Utilisateur non identifie.';
      this.isLoading = false;
      return;
    }

    this.commandeService.getCommandesParent(parentId).subscribe({
      next: (list) => {
        this.commandes = list
          .sort((a, b) =>
            new Date(b.dateCommande).getTime() - new Date(a.dateCommande).getTime()
          );
        this.isLoading = false;
      },
      error: (err) => {
        console.error('[Commandes Parent] erreur API', err);
        this.errorMsg = 'Impossible de charger vos commandes.';
        this.isLoading = false;
      }
    });
  }

  /** =========================
   *   UI Helpers
   * ========================= */
  beneficiaires(c: CommandeDTO): string[] {
    const set = new Set<string>();
    for (const l of (c?.lignes ?? [])) {
      const full = `${l.beneficiairePrenom ?? ''} ${l.beneficiaireNom ?? ''}`.trim();
      if (full) set.add(full);
    }
    return Array.from(set);
  }

  articlesResume(c: CommandeDTO): string {
    const lignes = c?.lignes ?? [];
    if (!lignes.length) return '-';
    const count = lignes.reduce((sum, l) => sum + (Number(l.quantite) || 0), 0);
    const noms = Array.from(new Set(lignes.map(l => l.produitNom || 'Produit').filter(Boolean)));
    const preview = noms.slice(0, 2).join(', ');
    const more = noms.length > 2 ? ` (+${noms.length - 2})` : '';
    return `${count} article${count > 1 ? 's' : ''} - ${preview}${more}`;
  }

  trackByCommande = (_: number, c: CommandeDTO) => c.id;
  trackByMembre = (_: number, m: string) => m;

  // Details
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

  // Methode pour normaliser l'affichage du mode de paiement
  normalizeModePaiement(mode: string): string {
    if (!mode) return '-';
    const m = mode.toUpperCase();
    switch (m) {
      case 'CB':
      case 'STRIPE':
        return 'CB';
      case 'CLUB':
        return 'Paiement au club';
      case 'CHEQUE':
        return 'Cheque';
      case 'VIREMENT':
        return 'Virement';
      default:
        return mode;
    }
  }
}
