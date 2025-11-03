import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface RequiredDocConfig {
  id?: number;
  clubId: number;
  code: string;
  label: string;
  required: boolean;
  active: boolean;
  orderIndex?: number | null;
}

@Injectable({ providedIn: 'root' })
export class RequiredDocsService {
  private readonly API_BASE = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token && token !== 'null' && token !== 'undefined') {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  getByClub(clubId: number): Observable<RequiredDocConfig[]> {
    return this.http.get<RequiredDocConfig[]>(`${this.API_BASE}/documents-requis/club/${clubId}`, { headers: this.authHeaders() });
  }

  createOne(payload: RequiredDocConfig): Observable<RequiredDocConfig> {
    return this.http.post<RequiredDocConfig>(`${this.API_BASE}/documents-requis`, payload, { headers: this.authHeaders() });
  }

  updateOne(id: number, patch: Partial<RequiredDocConfig>): Observable<RequiredDocConfig> {
    return this.http.put<RequiredDocConfig>(`${this.API_BASE}/documents-requis/${id}`, patch, { headers: this.authHeaders() });
  }

  deleteOne(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_BASE}/documents-requis/${id}`, { headers: this.authHeaders() });
  }
}
