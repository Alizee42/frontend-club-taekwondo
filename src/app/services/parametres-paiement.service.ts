// src/app/services/parametres-paiement.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { ParametresPaiement } from '../models/parametres-paiement';

@Injectable({ providedIn: 'root' })
export class ParametresPaiementService {
  private readonly API = '/api/parametres-paiement';

  /** Valeurs par défaut si tout échoue (éviter de casser l’UI) */
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

  /** En-têtes HTTP avec le token (pour la route admin) */
  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  /**
   * Charge les paramètres :
   * 1) Essaye la route ADMIN (avec token)
   * 2) Si échec => bascule sur la route PUBLIC (sans token)
   * 3) Si encore échec => valeurs par défaut
   */
  chargerParametres(): void {
    this.http.get<ParametresPaiement>(`${this.API}`, { headers: this.authHeaders() })
      .pipe(
        catchError((errAdmin) => {
          console.warn('⚠️ Échec GET admin, on tente la route publique:', errAdmin);
          return this.http.get<ParametresPaiement>(`${this.API}/public`)
            .pipe(
              catchError((errPublic) => {
                console.error('❌ Échec GET public, fallback sur défaut:', errPublic);
                return of(this.defaultParametres);
              })
            );
        }),
        tap((data) => {
          this.parametresSubject.next(data || this.defaultParametres);
        })
      )
      .subscribe();
  }

  /** Alias pratique pour recharger */
  reload(): void {
    this.chargerParametres();
  }

  /** Accès synchrone au cache courant */
  getParametres(): ParametresPaiement {
    const current = this.parametresSubject.value;
    return current;
  }

  /**
   * Sauvegarde (route ADMIN). Si OK, on met à jour le cache local.
   * Si ton backend attend un PUT, remplace `post` par `put`.
   */
  sauvegarder(parametres: ParametresPaiement): Observable<any> {
    return this.http.post(`${this.API}`, parametres, { headers: this.authHeaders() })
      .pipe(
        tap(() => {
          this.parametresSubject.next(parametres);
        }),
        catchError((err) => {
          console.error('❌ Erreur sauvegarde paramètres (admin):', err);
          return of(err);
        })
      );
  }
}
