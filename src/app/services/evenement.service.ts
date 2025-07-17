import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EvenementService {
  private apiUrl = 'http://localhost:8080/api/evenements';

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
