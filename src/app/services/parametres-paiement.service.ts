// src/app/services/parametres-paiement.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { ParametresPaiement } from '../models/parametres-paiement';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ParametresPaiementService {
  /** Lecture publique des paramètres de paiement pour un club */
  getParametresPaiementPublicByClub(clubId: number) {
    return this.http.get<ParametresPaiement>(`${this.publicUrl}/club/${clubId}`).pipe(
      catchError(err => {
          // console.warn('[ParametresPaiementService] Erreur public club → fallback défaut', err);
        return of(this.defaultParametres);
      })
    );
  }

  /** Lecture admin des paramètres de paiement pour un club */
  getParametresPaiementByClub(clubId: number) {
    return this.http.get<ParametresPaiement>(`${this.adminUrl}/club/${clubId}`).pipe(
      catchError(err => {
          // console.warn('[ParametresPaiementService] Erreur admin club → fallback public', err);
        return this.getParametresPaiementPublicByClub(clubId);
      })
    );
  }

  /** Sauvegarde des paramètres de paiement pour un club (admin) */
  sauvegarderParClub(clubId: number, parametres: ParametresPaiement) {
    return this.http.post(`${this.adminUrl}/club/${clubId}`, parametres).pipe(
      tap(() => this.parametresSubject.next(parametres)),
      catchError(err => {
          // console.error('❌ Erreur sauvegarde paramètres club:', err);
        throw err;
      })
    );
  }

  private readonly API = `${environment.apiUrl}/parametres-paiement`;
  private readonly adminUrl = `${this.API}`;        // Admin GET/POST sur /api/parametres-paiement
  private readonly publicUrl = `${this.API}/public`;
  
  private readonly defaultParametres: ParametresPaiement = {
    montantCotisation: 100,  // ✅ Cohérent avec le backend
    virement: true,
    especes: true,
    stripe: true,
    modePaiementParDefaut: 'stripe',
    echeancesAutorisees: 4,        // ✅ CHANGÉ : 4 au lieu de 3
    intervalleEcheance: 'MENSUEL'  // ✅ Format cohérent
  };

  private parametresSubject = new BehaviorSubject<ParametresPaiement>(this.defaultParametres);
  public readonly parametres$ = this.parametresSubject.asObservable();

  constructor(private http: HttpClient, private auth: AuthService) {}

  /** Charge les paramètres avec stratégie basée sur le rôle */
  chargerParametres(): void {
    const role = this.auth.getRole();
    const isAdmin = role === 'ADMIN';

    const public$ = this.http.get<ParametresPaiement>(this.publicUrl).pipe(
  tap(() => {/* ...log supprimé... */}),
      catchError(err => {
        console.warn('[ParametresPaiementService] Erreur public → fallback défaut', err);
        return of(this.defaultParametres);
      })
    );

    if (!isAdmin) {
      // 🎯 Direct public si pas admin
      public$.subscribe(p => this.parametresSubject.next(p));
      return;
    }

    // ADMIN : essayer admin puis fallback public
    this.http.get<ParametresPaiement>(this.adminUrl).pipe(
  tap(() => {/* ...log supprimé... */}),
      catchError(err => {
          // console.warn('[ParametresPaiementService] Échec admin → fallback public', err);
        return of(null);
      }),
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
    // ✅ CORRECTION : POST vers /api/parametres-paiement (pas /admin)
    return this.http.post(this.API, parametres).pipe(
      tap(() => this.parametresSubject.next(parametres)),
      catchError(err => {
        console.error('❌ Erreur sauvegarde paramètres:', err);
        throw err;
      })
    );
  }
}