import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';

// Définition de l'interface Produit
export interface Produit {
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

@Injectable({
  providedIn: 'root'
})
export class PanierService {
  private panier: Produit[] = [];
  private panierSubject = new BehaviorSubject<Produit[]>([]); // Observable pour le panier
  private cartCountSubject = new BehaviorSubject<number>(0); // Observable pour le badge

  cartCount$ = this.cartCountSubject.asObservable(); // Observable exposé
  panier$ = this.panierSubject.asObservable(); // Observable exposé pour le panier

  constructor(private http: HttpClient) {
    const storedPanier = localStorage.getItem('panier');
    this.panier = storedPanier ? JSON.parse(storedPanier) : [];
    this.cartCountSubject.next(this.panier.length); // Initialisation du badge
    this.panierSubject.next(this.panier); // Initialisation du panier
  }

  getPanier(): Produit[] {
    return this.panier;
  }

  ajouterAuPanier(produit: Produit): void {
    this.panier.push(produit);
    this.sauvegarderPanier();
  }

  viderPanier(): void {
    this.panier = [];
    this.sauvegarderPanier();
  }

  setPanier(panier: Produit[]): void {
    this.panier = panier;
    this.sauvegarderPanier();
  }

  private sauvegarderPanier(): void {
    localStorage.setItem('panier', JSON.stringify(this.panier));
    this.cartCountSubject.next(this.panier.length); // Met à jour le badge
    this.panierSubject.next(this.panier); // Notifie les abonnés des changements
  }
}