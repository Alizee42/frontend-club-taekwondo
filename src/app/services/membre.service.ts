import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

interface Membre {
  id: number;
  nom: string;
  prenom: string;
}

@Injectable({
  providedIn: 'root'
})
export class MembreService {
  private readonly apiUrl = 'http://localhost:8080/api/membres/mes-enfants';

  constructor(private http: HttpClient) {}

  getMembresPourParentConnecte(): Observable<Membre[]> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    return this.http.get<Membre[]>(this.apiUrl, { headers });
  }
}
