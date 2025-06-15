import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PaiementService {

  private apiUrl = 'http://localhost:8080/api/paiements'; // adapte si besoin

  constructor(private http: HttpClient) { }

  getPaiement(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  payerCotisation(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/payer`, {});
  }
  payerEcheance(id: number, nombreEcheances: number, montantTotalAPayer: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/payer-echeance`, { nombreEcheances, montantTotalAPayer });
  }
  getHistoriquePaiements(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}/historique`);
  }
  createPaymentIntent(request: any): Observable<any> {
    return this.http.post('http://localhost:8080/api/stripe/create-payment-intent', request); // Utilise le bon endpoint
  }
  
}
