import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class PanierService {
  private panier: any[] = [];

  constructor(private http: HttpClient) {
    const storedPanier = localStorage.getItem('panier');
    this.panier = storedPanier ? JSON.parse(storedPanier) : [];
  }

  getPanier(): any[] {
    return this.panier;
  }

  ajouterAuPanier(produit: any): void {
    this.panier.push(produit);
    localStorage.setItem('panier', JSON.stringify(this.panier));
  }

  viderPanier(): void {
    this.panier = [];
    localStorage.removeItem('panier');
  }

  getCartCount(): number {
    return this.panier.length;
  }
  commander(commandeDTO: any): Observable<any> {
    console.log('Commande envoyée au backend :', commandeDTO);
    // Remplacez l'URL par celle de votre backend
    return this.http.post('http://localhost:8080/api/commandes/with-lignes', commandeDTO);
  }
  setPanier(panier: any[]): void {
    this.panier = panier;
    localStorage.setItem('panier', JSON.stringify(this.panier));
  }
}