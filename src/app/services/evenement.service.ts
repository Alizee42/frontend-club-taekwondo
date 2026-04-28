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
  imageFilename?: string;
  actif: boolean;
  nbInscrits?: number;
  inscriptionStatut?: string;
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
    return this.http.put<any>(`${this.apiUrl}/${id}/statut`, body).pipe(
      map(e => this.mapToEvenementDTO(e))
    );
  }

  /** Récupérer les événements d'un club */
  getEvenementsByClub(clubId: number): Observable<EvenementDTO[]> {
    return this.http.get<any[]>(`${this.apiUrl}/club/${clubId}`).pipe(
      map(events => events.map(e => this.mapToEvenementDTO(e)))
    );
  }

  getEvenementsMonClub(): Observable<EvenementDTO[]> {
    return this.http.get<any[]>(`${this.apiUrl}/mon-club`).pipe(
      map(events => events.map(e => this.mapToEvenementDTO(e)))
    );
  }

  // ======================== INSCRIPTIONS ========================

  /** S'inscrire à un événement (utilise la vraie route backend) */
  inscrireMembreEvenement(evenementId: number, commentaire?: string): Observable<InscriptionEvenementDTO> {
    
    // ✅ CORRECTION : Format attendu par le backend (même pour un seul membre)
    const body = { 
      evenementId, 
      commentaire: commentaire || ''
    };
    
  // ...log supprimé...
    return this.http.post<any>(`${environment.apiUrl}/inscriptions/me`, body);
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
      membreIds: [membreIdNum],
      commentaire: commentaire || '',
      parentId: this.getUserId() // ✅ Ajout du parentId si nécessaire
    };

  // ...log supprimé...
  // ...log supprimé...
  // ...log supprimé...
    
    return this.http.post<any>(`${environment.apiUrl}/inscriptions`, body).pipe(
      map(response => Array.isArray(response) ? response[0] : response)
    );
  }

  /** Se désinscrire d'un événement */
  desinscrireEvenement(inscriptionId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/inscriptions/${inscriptionId}`);
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
    return this.http.get<any[]>(`${environment.apiUrl}/inscriptions/me`);
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
      imageUrl: this.resolveEventImageUrl(api.imageUrl, api.imageFilename),
      imageFilename: api.imageFilename || null,
      actif: api.actif !== false,
      nbInscrits: Number(api.nbInscrits) || 0,
      isInscrit: Boolean(api.isInscrit),
      inscriptionId: api.inscriptionId ?? null,
      inscriptionStatut: api.inscriptionStatut ?? null
    };
  }

  private resolveEventImageUrl(imageUrl?: string | null, imageFilename?: string | null): string | undefined {
    const apiBase = environment.apiUrl.replace(/\/api\/?$/i, '');
    const raw = (imageUrl || imageFilename || '').trim();

    if (!raw) return undefined;
    if (raw.startsWith('data:') || raw.startsWith('blob:')) return raw;

    if (/^https?:\/\//i.test(raw)) {
      try {
        const url = new URL(raw);
        const apiUrl = new URL(apiBase);

        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
          url.protocol = apiUrl.protocol;
          url.hostname = apiUrl.hostname;
          url.port = apiUrl.port;
        }

        return url.toString();
      } catch {
        return raw;
      }
    }

    const normalized = raw.replace(/^\/+/, '');

    if (normalized.startsWith('uploads/')) {
      return `${apiBase}/${normalized}`;
    }

    if (normalized.startsWith('evenements/')) {
      return `${apiBase}/uploads/${normalized}`;
    }

    return `${apiBase}/uploads/evenements/${encodeURIComponent(normalized)}`;
  }
}


