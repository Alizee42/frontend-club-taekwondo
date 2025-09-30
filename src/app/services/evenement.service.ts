import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

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

  constructor(private http: HttpClient, private authService: AuthService) {}

  // Méthode privée pour générer les headers avec authentification
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token || ''}`
    });
  }

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
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getAuthHeaders() });
  }

  /** Changer le statut actif/inactif d'un événement */
  changerStatutEvenement(id: number, actif: boolean): Observable<EvenementDTO> {
    const body = { actif };
    return this.http.put<any>(`${this.apiUrl}/${id}/statut`, body, { headers: this.getAuthHeaders() }).pipe(
      map(e => this.mapToEvenementDTO(e))
    );
  }

  // ======================== INSCRIPTIONS ========================

  /** S'inscrire à un événement (utilise la vraie route backend) */
  inscrireMembreEvenement(evenementId: number, commentaire?: string): Observable<InscriptionEvenementDTO> {
    const utilisateurId = this.getUserId();
    
    // ✅ CORRECTION : Format attendu par le backend (même pour un seul membre)
    const body = { 
      evenementId, 
      enfantsIds: [utilisateurId], // ✅ LISTE d'IDs même pour un seul membre
      commentaire: commentaire || ''
    };
    
    console.log('🔍 Service: Inscription membre, données envoyées:', body);
    return this.http.post<any>(`${environment.apiUrl}/inscriptions`, body, { headers: this.getAuthHeaders() });
  }

  /** Inscrire un enfant à un événement - ✅ CORRIGÉ : utilise le bon format backend */
  inscrireEnfantEvenement(evenementId: number, membreId: number, commentaire?: string): Observable<InscriptionEvenementDTO> {
    // ✅ CORRECTION : Format attendu par le backend avec validation stricte
    if (!evenementId || !membreId) {
      throw new Error('ID événement et ID membre sont requis');
    }

    // ✅ Validation des types numériques
    const evenementIdNum = Number(evenementId);
    const membreIdNum = Number(membreId);
    
    if (isNaN(evenementIdNum) || isNaN(membreIdNum)) {
      throw new Error('Les IDs doivent être des nombres valides');
    }

    const body = { 
      evenementId: evenementIdNum, 
      enfantsIds: [membreIdNum], // ✅ LISTE d'IDs comme attendu par le backend
      commentaire: commentaire || '',
      parentId: this.getUserId() // ✅ Ajout du parentId si nécessaire
    };

    console.log('🔍 Service: Inscription enfant, données envoyées:', JSON.stringify(body, null, 2));
    console.log('🔍 Service: URL complète:', `${environment.apiUrl}/inscriptions`);
    console.log('🔍 Service: Headers envoyés:', this.getAuthHeaders().get('Authorization')?.substring(0, 20) + '...');
    
    return this.http.post<any>(`${environment.apiUrl}/inscriptions`, body, { headers: this.getAuthHeaders() });
  }

  /** Se désinscrire d'un événement */
  desinscrireEvenement(inscriptionId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/inscriptions/${inscriptionId}`, { headers: this.getAuthHeaders() });
  }

  // Méthode utilitaire pour récupérer l'ID utilisateur
  private getUserId(): number {
    const utilisateurId = this.authService.getUserIdFromToken();
    if (!utilisateurId) {
      throw new Error('Utilisateur non connecté');
    }
    return utilisateurId;
  }

  /** Récupérer mes inscriptions */
  getMesInscriptions(): Observable<InscriptionEvenementDTO[]> {
    return this.http.get<any[]>(`${this.apiUrl}/mes-inscriptions`);
  }

  /** Récupérer les inscriptions de mes enfants (parent) */
  getInscriptionsEnfants(): Observable<InscriptionEvenementDTO[]> {
    const parentId = this.getUserId();
    return this.http.get<any[]>(`${this.apiUrl}/inscriptions-enfants?parentId=${parentId}`);
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