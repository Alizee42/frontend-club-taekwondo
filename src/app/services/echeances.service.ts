import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Echeance {
  id: number;
  nom: string;
  prenom: string;
  dateEcheance: Date;
  montant: number;
  statut: string;
}

@Injectable({
  providedIn: 'root'
})
export class EcheancesService {
  private apiUrl = '/api/echeances'; 

  constructor(private http: HttpClient) {}

  getAllEcheances(): Observable<Echeance[]> {
    return this.http.get<Echeance[]>(this.apiUrl);
  }

  // autres méthodes si besoin plus tard (update, delete, etc.)
}
