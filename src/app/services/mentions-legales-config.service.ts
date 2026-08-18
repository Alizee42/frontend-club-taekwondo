import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MentionsLegalesConfig {
  clubId?: number;
  nomAssociation?: string;
  statutJuridique?: string;
  adresse?: string;
  numeroRna?: string;
  numeroSiren?: string;
  representantLegal?: string;
  email?: string;
  telephone?: string;
  hebergeurNom?: string;
  hebergeurAdresse?: string;
  hebergeurSiteWeb?: string;
  mediateurNom?: string;
  mediateurContact?: string;
}

@Injectable({ providedIn: 'root' })
export class MentionsLegalesConfigService {

  private url = `${environment.apiUrl}/mentions-legales-config`;

  constructor(private http: HttpClient) {}

  getConfig(clubId: number): Observable<MentionsLegalesConfig> {
    const params = new HttpParams().set('clubId', clubId);
    return this.http.get<MentionsLegalesConfig>(this.url, { params });
  }

  updateConfig(dto: MentionsLegalesConfig): Observable<MentionsLegalesConfig> {
    return this.http.put<MentionsLegalesConfig>(this.url, dto);
  }
}
