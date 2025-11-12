import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SuperAdminPaiementService {
  constructor(private http: HttpClient) {}

  getAllPaiements(): Observable<any[]> {
    return this.http.get<any[]>('/api/paiements');
  }
}
