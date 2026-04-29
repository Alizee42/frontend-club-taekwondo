import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { PanierService } from '../../services/panier.service';
import { ProduitService, Produit as ProduitApi } from '../../services/produit.service';
import { AuthService } from '../../services/auth.service';
import { ClubSelectionService } from '../../services/club-selection.service';
import { ToastService } from '../../shared/toast/toast.service';
import { MiniCartComponent } from './mini-cart/mini-cart.component';

interface ProduitUI {
  id: number;
  nom: string;
  description: string;
  prixBase: number;
  imageUrl: string;
  tailles: string[];
  couleurs: string[];
  flocageDisponible: boolean;
  flocageTexte: string;
}

interface Selection {
  taille: string | null;
  couleur: string;
  flocageActif: boolean;
  quantite: number;
}

@Component({
  standalone: true,
  selector: 'app-boutique',
  templateUrl: './boutique.component.html',
  styleUrls: ['./boutique.component.css'],
  imports: [CommonModule, FormsModule, MiniCartComponent],
})
export class BoutiqueComponent implements OnInit, OnDestroy {
  produits: ProduitUI[] = [];
  selections: Record<number, Selection> = {};
  loading = true;
  error = false;
  cartOpen = false;
  confirmations: Record<number, boolean> = {};

  private sub = new Subscription();

  constructor(
    private panierService: PanierService,
    private produitService: ProduitService,
    private auth: AuthService,
    private clubSelection: ClubSelectionService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.sub.add(this.panierService.openCart$.subscribe(() => (this.cartOpen = true)));

    const clubId = this.getClubId();
    if (clubId) {
      this.chargerProduits(clubId);
    } else {
      this.sub.add(
        this.clubSelection.selectedClubId$.subscribe(id => {
          if (id) { this.chargerProduits(id); }
          else { this.loading = false; }
        })
      );
    }
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); }

  private getClubId(): number | null {
    const user = this.auth.getUtilisateurConnecte();
    if (user?.['clubId']) return Number(user['clubId']);
    return this.clubSelection.getSelectedClubId();
  }

  private chargerProduits(clubId: number): void {
    this.loading = true;
    this.error = false;
    this.produitService.getProduitsByClub(clubId).subscribe({
      next: (produits: ProduitApi[]) => {
        this.produits = produits.map(p => this.toProduitUI(p));
        for (const p of this.produits) {
          this.selections[p.id] = {
            taille: p.tailles[0] ?? null,
            couleur: p.couleurs[0] ?? 'Blanc',
            flocageActif: false,
            quantite: 1,
          };
        }
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      }
    });
  }

  private toProduitUI(p: ProduitApi): ProduitUI {
    return {
      id: p.id,
      nom: p.nom,
      description: p.description,
      prixBase: p.prix,
      imageUrl: p.imageUrl ?? 'assets/images/produit-placeholder.png',
      tailles: this.genererTailles(),
      couleurs: ['Blanc'],
      flocageDisponible: true,
      flocageTexte: 'Olympique Taekwondo',
    };
  }

  private genererTailles(): string[] {
    return Array.from({ length: (210 - 120) / 10 + 1 }, (_, i) => `${120 + i * 10} cm`);
  }

  private sel(id: number): Selection {
    if (!this.selections[id]) {
      this.selections[id] = { taille: null, couleur: 'Blanc', flocageActif: false, quantite: 1 };
    }
    return this.selections[id];
  }

  getPrixUnitaire(p: ProduitUI): number {
    return p.prixBase + (this.sel(p.id).flocageActif ? 10 : 0);
  }

  getPrixTotal(p: ProduitUI): number {
    return this.getPrixUnitaire(p) * Math.max(1, this.sel(p.id).quantite);
  }

  getTaille(p: ProduitUI): string | null { return this.sel(p.id).taille; }
  getCouleur(p: ProduitUI): string { return this.sel(p.id).couleur; }
  getFlocageActif(p: ProduitUI): boolean { return this.sel(p.id).flocageActif; }
  getQuantite(p: ProduitUI): number { return this.sel(p.id).quantite; }

  onChangeTaille(p: ProduitUI, v: string): void { this.sel(p.id).taille = v || null; }
  onChangeCouleur(p: ProduitUI, v: string): void { this.sel(p.id).couleur = v; }
  onToggleFlocage(p: ProduitUI, v: boolean): void { this.sel(p.id).flocageActif = !!v; }
  onChangeQuantite(p: ProduitUI, v: string | number): void {
    this.sel(p.id).quantite = Math.max(1, Number(v) || 1);
  }

  ajouterAuPanier(p: ProduitUI): void {
    const s = this.sel(p.id);
    if (!s.taille) {
      this.toast.error('Veuillez sélectionner une taille.');
      return;
    }

    this.panierService.ajouterAuPanier({
      id: p.id,
      nom: p.nom,
      description: p.description,
      prixBase: p.prixBase,
      prix: this.getPrixUnitaire(p),
      imageUrl: p.imageUrl,
      taille: s.taille,
      couleur: s.couleur,
      flocageActif: s.flocageActif,
      flocage: s.flocageActif ? p.flocageTexte : '',
      quantite: s.quantite,
    });

    this.panierService.openCart();

    this.confirmations[p.id] = true;
    setTimeout(() => { this.confirmations[p.id] = false; }, 2000);
  }
}
