import { Component, OnInit } from '@angular/core';
import { CommandeService } from '../../services/commande.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

interface Produit {
  id: number; // 🔥 ajoute cette ligne
  nom: string;
  description: string;
  prixBase: number;
  prix: number;
  imageUrl: string;
  taille?: string;
  couleur?: string;
  floquageActif?: boolean;
  flocage?: string;
}


@Component({
  selector: 'app-boutique',
  templateUrl: './boutique.component.html',
  styleUrls: ['./boutique.component.css']
})
export class BoutiqueComponent implements OnInit {
  produits: Produit[] = [];
  panier: Produit[] = [];
  tailles: string[] = [];
  couleurs: string[] = ['Blanc'];
  confirmationMessage: string = '';

  constructor(
    private commandeService: CommandeService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.tailles = Array.from({ length: (210 - 120) / 10 + 1 }, (_, i) => `${120 + i * 10} cm`);

    this.produits = [
      {
        id: 1, // 🔥 correspond à l'ID réel en base
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
      total += 10;
    }
    return total;
  }

  ajouterAuPanier(produit: Produit): void {
    if (!produit.taille) {
      alert('Veuillez sélectionner une taille.');
      return;
    }

    const copie = { ...produit };
    copie.prix = this.calculerPrix(copie);
    copie.flocage = copie.floquageActif ? 'tkdVilleurbannais' : '';

    this.panier.push(copie);
    alert('Produit ajouté au panier !');
  }

  commander(): void {
    const utilisateur = this.authService.getUtilisateurConnecte();
    console.log('Utilisateur connecté récupéré :', utilisateur);

    if (!utilisateur) {
      console.error('Erreur : utilisateur non connecté.');
      alert('Veuillez vous connecter pour commander.');
      return;
    }

    if (this.panier.length === 0) {
      alert('Votre panier est vide.');
      return;
    }

    const commandeDTO = {
      utilisateurId: utilisateur.id,
      lignesCommande: this.panier.map(p => ({
        produitId: p.id, // ✅ maintenant reconnu
        quantite: 1,
        prixUnitaire: p.prix,
        sousTotal: p.prix
      }))
    };

    console.log('✅ Commande envoyée au backend :', commandeDTO);

    this.commandeService.creerCommandeAvecLignes(commandeDTO).subscribe({
      next: () => {
        this.confirmationMessage = 'Commande enregistrée avec succès !';
        this.panier = [];
      },
      error: err => {
        console.error('❌ Erreur lors de la commande :', err);
        alert('Une erreur est survenue. Veuillez réessayer.');
      }
    });
  }

  updatePrixTotal(): void {
    const tailleSelect = document.getElementById('taille') as HTMLSelectElement;
    const flocageCheckbox = document.getElementById('flocage') as HTMLInputElement;

    const produit = this.produits[0];
    produit.taille = tailleSelect.value;
    produit.floquageActif = flocageCheckbox.checked;

    const prixTotalElement = document.getElementById('prix-total') as HTMLElement;
    prixTotalElement.textContent = this.calculerPrix(produit).toString();
  }
}
