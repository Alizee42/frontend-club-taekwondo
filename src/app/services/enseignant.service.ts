import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Enseignant {
  id?: number;
  clubId: number;
  nom: string;
  prenom: string;
  specialite?: string;
  description?: string;
  photoUrl?: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
}

@Injectable({ providedIn: 'root' })
export class EnseignantService {
  private readonly API = `${environment.apiUrl}/enseignants`;

  constructor(private http: HttpClient) {}

  getByClub(clubId: number): Observable<Enseignant[]> {
    return this.http.get<Enseignant[]>(`${this.API}/club/${clubId}`);
  }

  create(payload: Enseignant): Observable<Enseignant> {
    return this.http.post<Enseignant>(this.API, payload);
  }

  update(id: number, payload: Partial<Enseignant>): Observable<Enseignant> {
    return this.http.put<Enseignant>(`${this.API}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }

  uploadPhoto(file: File): Observable<{ path: string }> {
    const form = new FormData();
    form.append('photo', file);
    return this.http.post<{ path: string }>(`${this.API}/upload-photo`, form);
  }
}
