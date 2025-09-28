import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// ==== Types frontend ====
export interface EvenementDTO {
  id: number;
  titre: string;
  description: string;
  dateDebut: string;
  dateFin: string;
  lieu: string;
  capacite: number;
  imageUrl?: string;
  actif: boolean;
  nbInscrits?: number;
  isInscrit?: boolean;     // Pour savoir si l'utilisateur connecté est inscrit
  inscriptionId?: number;  // <-- 🔹 Ajout pour gérer la désinscription
}

export interface InscriptionEvenementDTO {
  id: number;
  evenementId: number;
  utilisateurId: number;
  membreId?: number;
  dateInscription: string;
  commentaire?: string;
  statut: string;
}

@Injectable({
  providedIn: 'root'
})
export class EvenementService {
  private readonly apiUrl = `${environment.apiUrl}/evenements`;
  private jsonHeaders = new HttpHeaders({ 'Content-Type': 'application/json' });

  constructor(private http: HttpClient) {}

  // ======================== ÉVÉNEMENTS ========================

  /** Récupérer tous les événements */
  getAllEvenements(): Observable<EvenementDTO[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      map(events => events.map(e => this.mapToEvenementDTO(e)))
    );
  }

  /** Récupérer les événements actifs (pour public) */
  getEvenementsActifs(): Observable<EvenementDTO[]> {
    return this.http.get<any[]>(`${this.apiUrl}/actifs`).pipe(
      map(events => events.map(e => this.mapToEvenementDTO(e)))
    );
  }

  /** Récupérer un événement par ID */
  getEvenementById(id: number): Observable<EvenementDTO> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(e => this.mapToEvenementDTO(e))
    );
  }

  /** Ajouter un événement avec image */
  ajouterEvenement(formData: FormData): Observable<EvenementDTO> {
    return this.http.post<any>(`${this.apiUrl}`, formData).pipe(
      map(e => this.mapToEvenementDTO(e))
    );
  }

  /** Modifier un événement */
  modifierEvenement(id: number, formData: FormData): Observable<EvenementDTO> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, formData).pipe(
      map(e => this.mapToEvenementDTO(e))
    );
  }

  /** Supprimer un événement */
  supprimerEvenement(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /** Changer le statut actif/inactif d'un événement */
  changerStatutEvenement(id: number, actif: boolean): Observable<EvenementDTO> {
    const body = { actif };
    return this.http.put<any>(`${this.apiUrl}/${id}/statut`, body, { headers: this.jsonHeaders }).pipe(
      map(e => this.mapToEvenementDTO(e))
    );
  }

  // ======================== INSCRIPTIONS ========================

  /** S'inscrire à un événement (membre individuel) */
  inscrireMembreEvenement(evenementId: number, commentaire?: string): Observable<InscriptionEvenementDTO> {
    const body = { evenementId, commentaire };
    return this.http.post<any>(`${this.apiUrl}/${evenementId}/inscription`, body, { headers: this.jsonHeaders });
  }

  /** Inscrire un enfant à un événement (parent) */
  inscrireEnfantEvenement(evenementId: number, membreId: number, commentaire?: string): Observable<InscriptionEvenementDTO> {
    const body = { evenementId, membreId, commentaire };
    return this.http.post<any>(`${this.apiUrl}/${evenementId}/inscription-enfant`, body, { headers: this.jsonHeaders });
  }

  /** Se désinscrire d'un événement */
  desinscrireEvenement(evenementId: number, membreId?: number): Observable<void> {
    const url = membreId 
      ? `${this.apiUrl}/${evenementId}/desinscription?membreId=${membreId}`
      : `${this.apiUrl}/${evenementId}/desinscription`;
    return this.http.delete<void>(url);
  }

  /** Récupérer mes inscriptions */
  getMesInscriptions(): Observable<InscriptionEvenementDTO[]> {
    return this.http.get<any[]>(`${this.apiUrl}/mes-inscriptions`);
  }

  /** Récupérer les inscriptions de mes enfants (parent) */
  getInscriptionsEnfants(): Observable<InscriptionEvenementDTO[]> {
    return this.http.get<any[]>(`${this.apiUrl}/inscriptions-enfants`);
  }

  /** Récupérer les inscrits à un événement (admin) */
  getInscritsEvenement(evenementId: number): Observable<InscriptionEvenementDTO[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${evenementId}/inscrits`);
  }

  // ======================== MAPPING ========================

  private mapToEvenementDTO(api: any): EvenementDTO {
    return {
      id: api.id,
      titre: api.titre || '',
      description: api.description || '',
      dateDebut: api.dateDebut || '',
      dateFin: api.dateFin || '',
      lieu: api.lieu || '',
      capacite: Number(api.capacite) || 0,
      imageUrl: api.imageUrl || null,
      actif: api.actif !== false,
      nbInscrits: Number(api.nbInscrits) || 0,
      isInscrit: Boolean(api.isInscrit),
      inscriptionId: api.inscriptionId ?? null  // <-- 🔹 mapping ajouté
    };
  }
}
