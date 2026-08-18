import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AboutValue {
  bold: string;
  description: string;
}

export interface AboutConfig {
  clubId?: number;
  headingLine1?: string;
  headingLine2?: string;
  leadText?: string;
  descriptionText?: string;
  imagePath?: string;
  foundedYear?: string;
  badgeLabel?: string;
  chips?: string[];
  missionTitle?: string;
  missionText?: string;
  visionTitle?: string;
  visionText?: string;
  valuesTitle?: string;
  values?: AboutValue[];
}

@Injectable({ providedIn: 'root' })
export class AboutConfigService {

  private url = `${environment.apiUrl}/about-config`;

  constructor(private http: HttpClient) {}

  getConfig(clubId: number): Observable<AboutConfig> {
    const params = new HttpParams().set('clubId', clubId);
    return this.http.get<AboutConfig>(this.url, { params });
  }

  updateConfig(dto: AboutConfig): Observable<AboutConfig> {
    return this.http.put<AboutConfig>(this.url, dto);
  }

  uploadImage(file: File, clubId?: number): Observable<AboutConfig> {
    const form = new FormData();
    form.append('image', file);
    if (clubId != null) form.append('clubId', String(clubId));
    return this.http.post<AboutConfig>(`${this.url}/image`, form);
  }

  imageUrl(path: string | undefined): string {
    if (!path) return 'assets/images/image2.JPG';
    if (path.startsWith('http') || path.startsWith('/')) return path;
    return `${environment.apiUrl.replace('/api', '')}/uploads/${path}`;
  }
}
