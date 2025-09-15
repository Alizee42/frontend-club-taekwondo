// src/app/services/parametres-paiement.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

  /** Charge les paramètres avec fallback silencieux */
  chargerParametres(): void {
    const public$ = this.http.get<ParametresPaiement>(this.publicUrl).pipe(
      catchError(() => of(this.defaultParametres))
    );

    // 👉 L’interceptor ajoute déjà l’Authorization si le token existe
    this.http.get<ParametresPaiement>(this.adminUrl).pipe(
      catchError(() => of(null)),
      switchMap(adminRes => adminRes ? of(adminRes) : public$),
      tap(p => this.parametresSubject.next(p || this.defaultParametres))
    ).subscribe();
  }

  reload(): void {
    this.chargerParametres();
  }

  getParametres(): ParametresPaiement {
    return this.parametresSubject.value;
  }

  sauvegarder(parametres: ParametresPaiement) {
    return this.http.post(this.adminUrl, parametres).pipe(
      tap(() => this.parametresSubject.next(parametres)),
      catchError(err => of(err))
    );
  }
}
