import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Produit {
  id: number;
  nom: string;
  description: string;
  prix: number;
  stock: number;
  categorie: string;
  imageUrl?: string;
  clubId?: number;
}

@Injectable({ providedIn: 'root' })
export class ProduitService {
  private readonly API = `${environment.apiUrl}/produits`;

  constructor(private http: HttpClient) {}

  /** Récupère tous les produits d'un club */
  getProduitsByClub(clubId: number): Observable<Produit[]> {
    return this.http.get<Produit[]>(`${this.API}/club/${clubId}`);
  }

  // ...autres méthodes CRUD si besoin
}
