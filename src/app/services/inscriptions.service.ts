import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class InscriptionsService {
  private apiUrl = 'http://localhost:8080/api/inscriptions'; // URL complète de l'API
  
  constructor(private http: HttpClient) {}

  // 🔹 Récupérer les inscriptions par événement
  getInscriptionsByEvenement(evenementId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/evenement/${evenementId}`);
  }

  // 🔹 Mettre à jour le statut d'une inscription
    updateStatut(id: number, statut: string): Observable<void> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem('token')}`, // Ajoute le token JWT
      'Content-Type': 'application/json' // Spécifie le type de contenu
    });
    return this.http.patch<void>(`${this.apiUrl}/${id}/statut?statut=${statut}`, {}, { headers });
  }
}