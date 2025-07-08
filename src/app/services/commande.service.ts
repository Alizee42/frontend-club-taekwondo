import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CommandeService {
  private apiUrl = 'http://localhost:8080/api/commandes';
  private jsonHeaders = new HttpHeaders({ 'Content-Type': 'application/json' });

  constructor(private http: HttpClient) {}

  /** 🔹 Créer une commande avec ses lignes */
  creerCommandeAvecLignes(commandeDTO: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/with-lignes`, commandeDTO, {
      headers: this.jsonHeaders
    });
  }

  /** 🔹 Créer une commande en attente */
  creerCommandeEnAttente(commandeDTO: any): Observable<any> {
    const commandeAvecStatut = { ...commandeDTO, statut: 'EN_ATTENTE' };
    return this.creerCommandeAvecLignes(commandeAvecStatut);
  }

  /** 🔹 Récupérer toutes les commandes */
  getCommandes(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  /** 🔹 Récupérer un utilisateur par ID */
  getUtilisateur(utilisateurId: number): Observable<any> {
    return this.http.get<any>(`http://localhost:8080/api/utilisateurs/${utilisateurId}`);
  }

  /** 🔹 Changer uniquement le statut d'une commande (ex: RETIRE, ANNULEE) */
  changerStatut(id: number, statut: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/statut`, statut, {
      headers: new HttpHeaders({ 'Content-Type': 'text/plain' })
    });
  }

  /** 🔹 Valider une commande (paiement confirmé) */
  validerCommande(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/valider/${id}`, null);
  }

  /** 🔹 Mise à jour complète d'une commande (statut + modePaiement) */
  updateCommande(commandeId: number, payload: { statut: string; modePaiement: string }): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${commandeId}`, payload, {
      headers: this.jsonHeaders
    });
  }

  /** 🔹 Upload d'un justificatif de paiement pour une commande */
  uploadJustificatif(commandeId: number, formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/${commandeId}/justificatif`, formData);
  }

  /** 🔹 Mise à jour complète d'une commande (statut, modePaiement, datePaiement) */
  mettreAJourPaiementCommande(id: number, updateDTO: any): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, updateDTO, {
      headers: this.jsonHeaders
    });
  }

  /** 🔹 Récupérer les commandes à payer au club */
  getCommandesPaiementClub(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/paiement-club`);
  }

  /** 🔹 Valider manuellement un paiement au club (espèces/virement) */
  validerPaiementManuel(id: number, modePaiement: string, datePaiement: string): Observable<void> {
    const body = {
      statut: 'PAYEE', // Harmonisation du statut
      modePaiement,
      datePaiement
    };
    return this.http.put<void>(`${this.apiUrl}/${id}/valider`, body, { // Correction de l'URL
      headers: this.jsonHeaders
    });
  }
}
