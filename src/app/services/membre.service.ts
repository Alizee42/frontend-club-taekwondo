import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Membre {
  id: number;
  nom: string;
  prenom: string;
}

@Injectable({
  providedIn: 'root'
})
export class MembreService {
  private readonly apiUrl = '/api/membres';

  constructor(private http: HttpClient) {}

  /**
   * 🔹 Récupère les enfants du parent connecté
   */
  getMembresPourParentConnecte(): Observable<Membre[]> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get<Membre[]>(`${this.apiUrl}/mes-enfants`, { headers });
  }

  /**
   * 🔹 Récupère le membre lié à l'utilisateur connecté
   */
  getMembreConnecte(): Observable<Membre> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get<Membre>(`${this.apiUrl}/me`, { headers });
  }
}
