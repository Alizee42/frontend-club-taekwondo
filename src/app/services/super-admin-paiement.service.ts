import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SuperAdminPaiementService {
  constructor(private http: HttpClient) {}

  getAllPaiements(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/paiements`);
  }
}
