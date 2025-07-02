import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CommandeService {
  private apiUrl = 'http://localhost:8080/api/commandes';

  constructor(private http: HttpClient) {}

  // 🔹 Méthode pour créer une commande avec ses lignes
  creerCommandeAvecLignes(commandeDTO: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/with-lignes`, commandeDTO);
  }

  // 🔹 Méthode pour créer une commande avec statut "EN_ATTENTE"
  creerCommandeEnAttente(commandeDTO: any): Observable<any> {
    commandeDTO.statut = 'EN_ATTENTE'; // Ajout du statut "EN_ATTENTE"
    return this.http.post(`${this.apiUrl}/with-lignes`, commandeDTO);
  }
}
