// src/app/services/echeances.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Echeance {
  id: number;
  nom: string;              // parent
  prenom: string;           // parent
  dateEcheance: string | Date;
  montant: number;
  statut: string;
  numero?: number;
  email?: string;

  // champs utilisés par le composant
  enfantPrenom?: string;
  enfantNom?: string;
}

@Injectable({ providedIn: 'root' })
export class EcheancesService {
  private readonly apiUrl = `${environment.apiUrl}/echeances`;

  constructor(private http: HttpClient) {}

  /** 🔹 Récupère toutes les échéances avec normalisation */
  getAllEcheances(): Observable<Echeance[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      map(rows =>
        rows.map(r => {
          const enfantPrenom =
            r.enfantPrenom ?? r.membrePrenom ?? r.prenomEnfant ?? r?.enfant?.prenom ?? r.prenom ?? '';
          const enfantNom =
            r.enfantNom ?? r.membreNom ?? r.nomEnfant ?? r?.enfant?.nom ?? r.nom ?? '';

          return {
            id: r.id,
            nom: r.nom,
            prenom: r.prenom,
            dateEcheance: r.dateEcheance,
            montant: r.montant,
            statut: r.statut,
            numero: r.numero ?? undefined,
            email: r.email ?? undefined,
            enfantPrenom,
            enfantNom
          } as Echeance;
        })
      ),
      catchError(this.handleError)
    );
  }

  /** 🔹 Gestion centralisée des erreurs */
  private handleError(error: HttpErrorResponse) {
    const msg = error.error instanceof ErrorEvent
      ? `Erreur: ${error.error.message}`
      : `Erreur serveur ${error.status}: ${error.message}`;
    console.error('[EcheancesService]', msg, error);
    return throwError(() => new Error(msg));
  }
}
