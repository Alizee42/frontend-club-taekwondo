import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Galerie {
  id?: string;
  titre: string;
  imageUrl: string;
  description: string;
  datePublication?: string;
}

@Injectable({
  providedIn: 'root',
})
export class GalerieService {
  private apiUrl = '/api/galeries';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Galerie[]> {
    return this.http.get<Galerie[]>(this.apiUrl);
  }

  getById(id: string): Observable<Galerie> {
    return this.http.get<Galerie>(`${this.apiUrl}/${id}`);
  }

  create(galerie: Galerie): Observable<Galerie> {
    return this.http.post<Galerie>(this.apiUrl, galerie);
  }

  update(id: string, galerie: Galerie): Observable<Galerie> {
    return this.http.put<Galerie>(`${this.apiUrl}/${id}`, galerie);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}