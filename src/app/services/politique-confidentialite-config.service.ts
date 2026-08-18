import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PolitiqueConfidentialiteConfig {
  clubId?: number;
  nomAssociation?: string;
  adresse?: string;
  emailContact?: string;
  emailRgpd?: string;
  representantLegal?: string;
}

@Injectable({ providedIn: 'root' })
export class PolitiqueConfidentialiteConfigService {

  private url = `${environment.apiUrl}/politique-confidentialite-config`;

  constructor(private http: HttpClient) {}

  getConfig(clubId: number): Observable<PolitiqueConfidentialiteConfig> {
    const params = new HttpParams().set('clubId', clubId);
    return this.http.get<PolitiqueConfidentialiteConfig>(this.url, { params });
  }

  updateConfig(dto: PolitiqueConfidentialiteConfig): Observable<PolitiqueConfidentialiteConfig> {
    return this.http.put<PolitiqueConfidentialiteConfig>(this.url, dto);
  }
}
