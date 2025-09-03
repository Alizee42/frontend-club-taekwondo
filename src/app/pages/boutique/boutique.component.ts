import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';   // *ngIf, *ngFor
import { FormsModule } from '@angular/forms';     // [(ngModel)]
import { PanierService } from '../../services/panier.service';

interface Produit {
  id: number;
  nom: string;
  description: string;
  prixBase: number;   // prix unitaire hors options
  prix: number;       // prix unitaire (⚠️ pas le total ligne)
  imageUrl: string;
  taille?: string;
  couleur?: string;
  flocageActif?: boolean;
  flocage?: string;
  quantite?: number;
}

type Selection = {
  taille: string | null;
  flocageActif: boolean;
  quantite: number;
};

@Component({
  standalone: true,
  selector: 'app-boutique',
  templateUrl: './boutique.component.html',
  styleUrls: ['./boutique.component.css'],
  imports: [CommonModule, FormsModule],
})
export class BoutiqueComponent implements OnInit {
  produits: Produit[] = [];
  tailles: string[] = [];
  couleurs: string[] = ['Blanc'];
  confirmationMessage = '';

  /** selections[p.id] est toujours défini (on l'initialise dans ngOnInit) */
  selections: Record<number, Selection> = {};

  constructor(private panierService: PanierService) {}

  ngOnInit(): void {
    // Tailles 120 → 210 par pas de 10
    this.tailles = Array.from(
      { length: (210 - 120) / 10 + 1 },
      (_, i) => `${120 + i * 10} cm`
    );

    // Exemple de produit (extensible plus tard)
    this.produits = [
      {
        id: 1,
        nom: 'Dobok Taekwondo',
        description: 'Tenue blanche officielle',
        prixBase: 30,
        prix: 30, // prix unitaire initial = prixBase
        imageUrl: 'assets/images/dobok.jpg',
        taille: '',
        couleur: 'Blanc',
        flocageActif: false,
        flocage: '',
      },
    ];

    // État initial des sélections (clé = p.id)
    for (const p of this.produits) {
      this.selections[p.id] = { taille: null, flocageActif: false, quantite: 1 };
    }
  }

  /** (sécurité) s’assure qu’une entrée existe pour un id produit donné */
  private ensureSelection(productId: number): Selection {
    if (!this.selections[productId]) {
      this.selections[productId] = { taille: null, flocageActif: false, quantite: 1 };
    }
    return this.selections[productId];
  }

  /** Prix unitaire selon options */
  getPrixUnitaire(p: Produit): number {
    const sel = this.ensureSelection(p.id);
    let total = p.prixBase;
    if (sel.flocageActif) total += 10; // +10€ si flocage
    return total;
  }

  /** Prix total (unitaire * quantité) pour affichage */
  getPrixTotal(p: Produit): number {
    const sel = this.ensureSelection(p.id);
    return this.getPrixUnitaire(p) * Math.max(1, sel.quantite);
  }

  /** Ajout au panier (autorisé même déconnecté) */
  ajouterAuPanier(p: Produit): void {
    const sel = this.ensureSelection(p.id);
    if (!sel.taille) {
      alert('Veuillez sélectionner une taille.');
      return;
    }

    const quantite = Math.max(1, Number(sel.quantite || 1));
    const prixUnitaire = this.getPrixUnitaire(p); // ✅ unit price

    const item: Produit = {
      ...p,
      taille: sel.taille!,
      flocageActif: sel.flocageActif,
      quantite,
      prix: prixUnitaire, // ✅ on enregistre le prix unitaire
    };

    this.panierService.ajouterAuPanier(item);
    this.panierService.openCart(); // 👉 ouvre le mini-panier dans le header

    this.confirmationMessage = 'Produit ajouté au panier !';
    setTimeout(() => (this.confirmationMessage = ''), 2000);
  }

  /** Handlers pour (ngModelChange) — gardent l’état cohérent */
  onChangeTaille(p: Produit, taille: string) {
    this.ensureSelection(p.id).taille = taille || null;
  }

  // On garde le nom "onToggleFloquage" si ton template l'emploie déjà
  onToggleFloquage(p: Produit, checked: boolean) {
    this.ensureSelection(p.id).flocageActif = !!checked;
  }

  onChangeQuantite(p: Produit, val: string | number) {
    this.ensureSelection(p.id).quantite = Math.max(1, Number(val || 1));
  }
}
