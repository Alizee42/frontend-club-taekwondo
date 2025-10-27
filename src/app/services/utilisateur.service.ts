import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UtilisateurService {
  private apiUrl = environment.apiUrl + '/utilisateurs';

  constructor(private http: HttpClient) {}

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
  add(utilisateur: any) {
    return this.http.post<any>(this.apiUrl, utilisateur);
  }

  update(utilisateur: any) {
    return this.http.put<any>(`${this.apiUrl}/${utilisateur.id}`, utilisateur);
  }

  delete(id: number) {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
