import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';

export interface ContactPayload {
  name: string;
  email: string;
  objet: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly base = environment.apiUrl + '/public/contact';
  constructor(private http: HttpClient) {}

  async envoyer(payload: ContactPayload): Promise<void> {
    await firstValueFrom(this.http.post(this.base, payload));
  }
}
