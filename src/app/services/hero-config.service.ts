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
  private backendBaseUrl = environment.apiUrl.replace(/\/api\/?$/, '');

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
    if (!path || !path.trim()) return 'assets/videos/hero-optimise.mp4';

    const raw = path.trim();
    if (/^https?:\/\//i.test(raw)) return raw;

    if (raw.startsWith('/api/uploads/')) {
      return `${this.backendBaseUrl}${this.encodePath(raw.replace(/^\/api/, ''))}`;
    }

    if (raw.startsWith('/uploads/')) {
      return `${this.backendBaseUrl}${this.encodePath(raw)}`;
    }

    const relative = raw.startsWith('uploads/') ? raw.substring('uploads/'.length) : raw;
    return `${this.backendBaseUrl}/uploads/${this.encodePath(relative)}`;
  }

  private encodePath(path: string): string {
    return path
      .split('/')
      .filter((part, index) => index === 0 || part.length > 0)
      .map((part) => {
        if (part === '') return part;
        try {
          return encodeURIComponent(decodeURIComponent(part));
        } catch {
          return encodeURIComponent(part);
        }
      })
      .join('/');
  }
}
