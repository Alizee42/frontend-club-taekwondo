import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EvenementService {
  private apiUrl = `${environment.apiUrl}/evenements`;

  constructor(private http: HttpClient) {}

  /** 🔹 Récupérer tous les événements */
  getAllEvenements(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  /** 🔹 Ajouter un événement avec image */
  ajouterEvenement(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}`, formData); // ne PAS mettre d'en-tête Content-Type
  }  

  /** 🔹 Supprimer un événement */
  supprimerEvenement(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
