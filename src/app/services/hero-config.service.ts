import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface HeroStat {
  value?: string;
  icon?: string;
  label: string;
}

export interface HeroConfig {
  videoPath?: string;
  eyebrowText?: string;
  identityStrong?: string;
  identityMid?: string;
  slogans?: string[];
  stats?: HeroStat[];
}

@Injectable({ providedIn: 'root' })
export class HeroConfigService {

  private url = `${environment.apiUrl}/hero-config`;

  constructor(private http: HttpClient) {}

  getConfig(): Observable<HeroConfig> {
    return this.http.get<HeroConfig>(this.url);
  }

  updateConfig(dto: HeroConfig): Observable<HeroConfig> {
    return this.http.put<HeroConfig>(this.url, dto);
  }

  uploadVideo(file: File): Observable<HeroConfig> {
    const form = new FormData();
    form.append('video', file);
    return this.http.post<HeroConfig>(`${this.url}/video`, form);
  }

  videoUrl(path: string | undefined): string {
    if (!path) return 'assets/videos/video1.MOV';
    if (path.startsWith('http') || path.startsWith('/')) return path;
    return `${environment.apiUrl.replace('/api', '')}/uploads/${path}`;
  }
}
