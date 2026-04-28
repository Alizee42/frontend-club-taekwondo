import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CampagneCommande {
  id?: number;
  titre: string;
  description?: string;
  dateOuverture: string;
  dateFermeture: string;
  actif: boolean;
  clubId?: number;
}

export interface LigneBonCommande {
  produitId: number;
  quantite: number;
  prixUnitaire?: number;
  taille?: string | null;
  couleur?: string | null;
  flocage?: string | null;
  beneficiaireId?: number | null;
}

export interface BonCommandeRequest {
  campagneId?: number;
  modePaiement: string;
  lignesCommande: LigneBonCommande[];
}

@Injectable({ providedIn: 'root' })
export class CampagneCommandeService {
  private readonly apiUrl = `${environment.apiUrl}/campagnes-commande`;
  private readonly commandeUrl = `${environment.apiUrl}/commandes`;

  constructor(private http: HttpClient) {}

  getCampagneActive(): Observable<CampagneCommande> {
    return this.http.get<CampagneCommande>(`${this.apiUrl}/active`);
  }

  getAll(): Observable<CampagneCommande[]> {
    return this.http.get<CampagneCommande[]>(this.apiUrl);
  }

  creer(dto: CampagneCommande): Observable<CampagneCommande> {
    return this.http.post<CampagneCommande>(this.apiUrl, dto);
  }

  modifier(id: number, dto: Partial<CampagneCommande>): Observable<CampagneCommande> {
    return this.http.put<CampagneCommande>(`${this.apiUrl}/${id}`, dto);
  }

  supprimer(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  soumettreEvenementCommande(req: BonCommandeRequest): Observable<any> {
    return this.http.post<any>(`${this.commandeUrl}/bon-de-commande`, req);
  }
}
