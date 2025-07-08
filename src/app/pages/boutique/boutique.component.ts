import { Component, OnInit } from '@angular/core';
import { CommandeService } from '../../services/commande.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { PanierService } from '../../services/panier.service';

interface Produit {
  id: number;
  nom: string;
  description: string;
  prixBase: number;
  prix: number;
  imageUrl: string;
  taille?: string;
  couleur?: string;
  floquageActif?: boolean;
  flocage?: string;
  quantite?: number;
}

@Component({
  selector: 'app-boutique',
  templateUrl: './boutique.component.html',
  styleUrls: ['./boutique.component.css']
})
export class BoutiqueComponent implements OnInit {
  produits: Produit[] = [];
  tailles: string[] = [];
  couleurs: string[] = ['Blanc'];
  confirmationMessage: string = '';

  constructor(
    private commandeService: CommandeService,
    private authService: AuthService,
    private panierService: PanierService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.tailles = Array.from({ length: (210 - 120) / 10 + 1 }, (_, i) => `${120 + i * 10} cm`);

    this.produits = [
      {
        id: 1,
        nom: 'Dobok Taekwondo',
        description: 'Tenue blanche officielle',
        prixBase: 30,
        prix: 30,
        imageUrl: 'assets/images/dobok.jpg',
        taille: '',
        couleur: 'Blanc',
        floquageActif: false,
        flocage: ''
      }
    ];
  }

  calculerPrix(produit: Produit): number {
    let total = produit.prixBase;
    if (produit.floquageActif) {
      total += 10; // Ajouter 10€ pour le flocage
    }
    return total;
  }

  ajouterAuPanier(produit: Produit): void {
    const tailleSelect = document.getElementById('taille') as HTMLSelectElement | null;
    const flocageCheckbox = document.getElementById('flocage') as HTMLInputElement | null;
    const quantiteInput = document.getElementById('quantite') as HTMLInputElement | null;

    if (!tailleSelect?.value) {
      alert('Veuillez sélectionner une taille.');
      return;
    }

    if (!flocageCheckbox || !quantiteInput) {
      alert('Une erreur est survenue. Veuillez réessayer.');
      return;
    }

    const copie: Produit = { ...produit };
    copie.taille = tailleSelect.value;
    copie.floquageActif = flocageCheckbox.checked;
    copie.quantite = parseInt(quantiteInput.value, 10) || 1; // Quantité par défaut : 1
    copie.prix = this.calculerPrix(copie) * copie.quantite;

    this.panierService.ajouterAuPanier(copie);
    alert('Produit ajouté au panier !');
  }

  updatePrixTotal(): void {
    const tailleSelect = document.getElementById('taille') as HTMLSelectElement | null;
    const flocageCheckbox = document.getElementById('flocage') as HTMLInputElement | null;

    if (!tailleSelect || !flocageCheckbox) {
      console.error('Impossible de mettre à jour le prix total. Les éléments DOM sont introuvables.');
      return;
    }

    const produit = this.produits[0];
    produit.taille = tailleSelect.value;
    produit.floquageActif = flocageCheckbox.checked;

    const prixTotalElement = document.getElementById('prix-total') as HTMLElement | null;
    if (prixTotalElement) {
      prixTotalElement.textContent = this.calculerPrix(produit).toFixed(2);
    } else {
      console.error('Élément pour afficher le prix total introuvable.');
    }
  }
}