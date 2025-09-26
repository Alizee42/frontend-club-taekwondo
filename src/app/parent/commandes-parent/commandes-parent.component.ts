import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommandeService, CommandeDTO } from '../../services/commande.service';

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

  constructor(private commandeService: CommandeService) {}

  ngOnInit(): void {
    this.chargerCommandes();
  }

  /** =========================
   *   JWT & ID utilisateur
   * ========================= */
  private decodeJwt(token?: string): any {
    try {
      if (!token) return null;
      const part = token.split('.')[1];
      if (!part) return null;
      const base64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
      return JSON.parse(atob(base64));
    } catch {
      return null;
    }
  }

private getCurrentUserId(): number | null {
  const token = localStorage.getItem('auth_token') || '';
  const claims = this.decodeJwt(token) || {};

  console.log('[CommandesParent] Token décodé complet:', claims);

  // ✅ Essaie différents champs possibles
  let utilisateurId = Number(claims.utilisateurId || claims.userId || claims.id || claims.sub);
  
  if (!isNaN(utilisateurId) && utilisateurId > 0) {
    console.log('[CommandesParent] utilisateurId trouvé:', utilisateurId);
    return utilisateurId;
  }

  // Debug pour voir le contenu du token
  console.warn('[CommandesParent] Token décodé:', claims);
  console.warn('[CommandesParent] Aucun utilisateurId valide trouvé');
  
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
      this.errorMsg = 'Utilisateur non identifié.';
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
    if (!lignes.length) return '—';
    const count = lignes.reduce((sum, l) => sum + (Number(l.quantite) || 0), 0);
    const noms = Array.from(new Set(lignes.map(l => l.produitNom || 'Produit').filter(Boolean)));
    const preview = noms.slice(0, 2).join(', ');
    const more = noms.length > 2 ? ` (+${noms.length - 2})` : '';
    return `${count} article${count > 1 ? 's' : ''} • ${preview}${more}`;
  }

  trackByCommande = (_: number, c: CommandeDTO) => c.id;
  trackByMembre = (_: number, m: string) => m;

  // Détails
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

  // Méthode pour normaliser l'affichage du mode de paiement
  normalizeModePaiement(mode: string): string {
    if (!mode) return '—';
    const m = mode.toUpperCase();
    switch (m) {
      case 'CB':
      case 'STRIPE':
        return 'CB';
      case 'CLUB':
        return 'Paiement au club';
      case 'CHEQUE':
        return 'Chèque';
      case 'VIREMENT':
        return 'Virement';
      default:
        return mode;
    }
  }
}
