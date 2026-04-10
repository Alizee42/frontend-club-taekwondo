import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

  getByClub(clubId: number): Observable<RequiredDocConfig[]> {
    return this.http.get<RequiredDocConfig[]>(`${this.API_BASE}/documents-requis/club/${clubId}`);
  }

  createOne(payload: RequiredDocConfig): Observable<RequiredDocConfig> {
    return this.http.post<RequiredDocConfig>(`${this.API_BASE}/documents-requis`, payload);
  }

  updateOne(id: number, patch: Partial<RequiredDocConfig>): Observable<RequiredDocConfig> {
    return this.http.put<RequiredDocConfig>(`${this.API_BASE}/documents-requis/${id}`, patch);
  }

  deleteOne(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_BASE}/documents-requis/${id}`);
  }
}
