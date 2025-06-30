import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-boutique',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './boutique.component.html',
  styleUrls: ['./boutique.component.css']
})
export class BoutiqueComponent implements OnInit {
  produits: any[] = [];
  panier: any[] = [];

  tailles = ['XS', 'S', 'M', 'L', 'XL'];
  couleurs = ['Blanc', 'Noir', 'Rouge', 'Bleu'];

  ngOnInit() {
    this.produits = [
      {
        id: 1,
        nom: 'Kimono Taekwondo',
        description: 'Kimono officiel du club, léger et résistant.',
        prix: 40,
        imageUrl: 'https://via.placeholder.com/250',
        taille: 'M',
        couleur: 'Blanc',
        flocage: ''
      },
      {
        id: 2,
        nom: 'T-shirt Club',
        description: 'T-shirt respirant avec logo brodé.',
        prix: 20,
        imageUrl: 'https://via.placeholder.com/250',
        taille: 'M',
        couleur: 'Noir',
        flocage: ''
      }
    ];
  }

  ajouterAuPanier(produit: any) {
    if (!produit.taille || !produit.couleur || !produit.flocage) {
      alert('Veuillez renseigner la taille, la couleur et le flocage.');
      return;
    }

    this.panier.push({ ...produit });
  }

  supprimerDuPanier(index: number) {
    this.panier.splice(index, 1);
  }

  getTotal(): number {
    return this.panier.reduce((total, item) => total + item.prix, 0);
  }

  payer() {
    alert('Fonction de paiement à venir...');
  }
}
