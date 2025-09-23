// src/app/services/parametres-paiement.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, of, Observable } from 'rxjs';
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
  readonly parametres$ = this.parametresSubject.asObservable();

  constructor(private http: HttpClient) {}

  /** 🔹 Charge les paramètres depuis l’API (admin sinon public) */
  chargerParametres(): void {
    const public$ = this.http.get<ParametresPaiement>(this.publicUrl).pipe(
      catchError(err => {
        console.warn('[ParametresPaiementService] Fallback public -> default', err);
        return of(this.defaultParametres);
      })
    );

    this.http.get<ParametresPaiement>(this.adminUrl).pipe(
      catchError(() => of(null)),
      switchMap(adminRes => adminRes ? of(adminRes) : public$),
      tap(p => this.parametresSubject.next(p || this.defaultParametres))
    ).subscribe();
  }

  /** 🔹 Forcer un rechargement */
  reload(): void {
    this.chargerParametres();
  }

  /** 🔹 Accéder au dernier état */
  getParametres(): ParametresPaiement {
    return this.parametresSubject.value;
  }

  /** 🔹 Sauvegarder côté admin */
  sauvegarder(parametres: ParametresPaiement): Observable<ParametresPaiement | null> {
    return this.http.post<ParametresPaiement>(this.adminUrl, parametres).pipe(
      tap(saved => {
        if (saved) {
          this.parametresSubject.next(saved); // ✅ on prend la réponse backend
        }
      }),
      catchError(err => {
        console.error('[ParametresPaiementService] Erreur sauvegarde', err);
        return of(null);
      })
    );
  }
}
