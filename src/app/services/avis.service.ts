import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface Avis {
  id?: number;
  contenu: string;
  pseudoVisiteur: string;
  approuve: boolean;
  note: number;
  typeAvis?: string;
  datePub?: string;
  photo?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AvisService {
  private apiUrl = 'http://localhost:8080/api/avis';

  constructor(private http: HttpClient) {}

  getAvis(): Observable<Avis[]> {
    return this.http.get<Avis[]>(this.apiUrl).pipe(catchError(this.handleError));
  }

  ajouterAvis(avis: Avis): Observable<Avis> {
    return this.http.post<Avis>(this.apiUrl, avis).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Une erreur est survenue';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Erreur : ${error.error.message}`;
    } else {
      errorMessage = `Erreur serveur : ${error.status} - ${error.message}`;
    }
    console.error(errorMessage);
    return throwError(errorMessage);
  }
}