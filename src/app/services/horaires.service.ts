import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HorairesService {
  // Mettre à jour un horaire
  updateHoraire(horaireId: number, horaire: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${horaireId}`, horaire);
  }
  private apiUrl = `${environment.apiUrl}/horaires`;

  constructor(private http: HttpClient) {}

  // Récupérer tous les horaires (super admin)
  getAllHoraires(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/all`);
  }

  // Récupérer les horaires d'un club
  getHorairesByClub(clubId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/club/${clubId}`);
  }

  // Ajouter un horaire à un club
  addHoraireToClub(clubId: number, horaire: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/club/${clubId}`, horaire);
  }

  // Supprimer un horaire
  deleteHoraire(horaireId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${horaireId}`);
  }
}
