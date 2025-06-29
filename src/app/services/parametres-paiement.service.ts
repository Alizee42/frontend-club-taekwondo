import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ParametresPaiement } from '../models/parametres-paiement';

@Injectable({ providedIn: 'root' })
export class ParametresPaiementService {
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
  public parametres$ = this.parametresSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Charge les paramètres depuis l’API ou fallback sur les valeurs par défaut
   */
  chargerParametres(): void {
    this.http.get<ParametresPaiement>('/api/parametres-paiement').pipe(
      tap((data) => {
        if (data) {
          this.parametresSubject.next(data);
        } else {
          this.parametresSubject.next(this.defaultParametres);
        }
      }),
      catchError((err) => {
        console.warn('⚠️ Erreur de chargement des paramètres, utilisation des valeurs par défaut.', err);
        this.parametresSubject.next(this.defaultParametres);
        return of(null);
      })
    ).subscribe();
  }

  /**
   * Retourne les paramètres actuels (synchrones)
   */
  getParametres(): ParametresPaiement {
    return this.parametresSubject.value;
  }

  /**
   * Sauvegarde les paramètres dans l’API et met à jour localement
   */
  sauvegarder(parametres: ParametresPaiement): Observable<any> {
    return this.http.post('/api/parametres-paiement', parametres).pipe(
      tap(() => this.parametresSubject.next(parametres))
    );
  }
}
