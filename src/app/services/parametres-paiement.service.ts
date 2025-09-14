// src/app/services/parametres-paiement.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { ParametresPaiement } from '../models/parametres-paiement';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ParametresPaiementService {

  private readonly API = `${environment.apiUrl}/parametres-paiement`;
  private readonly adminUrl = `${this.API}/admin`;
  private readonly publicUrl = `${this.API}/public`;
  

  private readonly defaultParametres: ParametresPaiement = {
    montantCotisation: 300,
    virement: true,
    especes: true,
    stripe: true,
    modePaiementParDefaut: 'virement',
    echeancesAutorisees: 3,
    intervalleEcheance: '1mois'
  };

  private parametresSubject = new BehaviorSubject<ParametresPaiement>(this.defaultParametres);
  public readonly parametres$ = this.parametresSubject.asObservable();

  constructor(private http: HttpClient) {}

  private authHeaders(): HttpHeaders {
    const token = (localStorage.getItem('token') || localStorage.getItem('auth_token') || '').trim();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  /** Charge les paramètres avec fallback silencieux */
  chargerParametres(): void {
    const headers = this.authHeaders();

    const public$ = this.http.get<ParametresPaiement>(this.publicUrl).pipe(
      catchError(() => of(this.defaultParametres))
    );

    // si pas de token → direct public, évite 400 bruyants
    if (!headers.has('Authorization')) {
      public$.pipe(tap(p => this.parametresSubject.next(p || this.defaultParametres))).subscribe();
      return;
    }

    // tente admin, puis fallback public sans console.error
    this.http.get<ParametresPaiement>(this.adminUrl, { headers }).pipe(
      catchError(() => of(null)),
      switchMap(adminRes => adminRes ? of(adminRes) : public$),
      tap(p => this.parametresSubject.next(p || this.defaultParametres))
    ).subscribe();
  }

  reload(): void { this.chargerParametres(); }

  getParametres(): ParametresPaiement {
    return this.parametresSubject.value;
  }

  sauvegarder(parametres: ParametresPaiement) {
    const headers = this.authHeaders();
    return this.http.post(this.adminUrl, parametres, { headers }).pipe(
      tap(() => this.parametresSubject.next(parametres)),
      catchError(err => of(err))
    );
  }
}
