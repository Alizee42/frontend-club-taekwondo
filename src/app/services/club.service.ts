import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Club {
  id: number;
  name: string;
  nom: string;
  ville: string;
  logo?: string;
  logoDisplay?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  rib?: string;
  stripeAccountId?: string | null;
  stripeChargesEnabled?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ClubService {
  private readonly apiUrl = `${environment.apiUrl}/clubs`;
  private selectedClubSubject: BehaviorSubject<Club | null>;
  public selectedClub$: Observable<Club | null>;

  /** Signal permettant d'ouvrir la modale de choix du club depuis n'importe quel composant. */
  private openPickerSubject = new Subject<void>();
  public openPicker$ = this.openPickerSubject.asObservable();

  requestOpenPicker(): void {
    this.openPickerSubject.next();
  }

  constructor(private http: HttpClient) {
    const club = this.getSelectedClub();
    this.selectedClubSubject = new BehaviorSubject<Club | null>(club);
    this.selectedClub$ = this.selectedClubSubject.asObservable();
    if (club?.id) {
      this.refreshSelectedClub(club.id);
    }
  }

  /** Recharge les données à jour du club sélectionné depuis l'API (le cache localStorage peut être périmé). */
  private refreshSelectedClub(clubId: number): void {
    this.http.get<Club>(`${this.apiUrl}/${clubId}`).subscribe({
      next: (freshClub) => this.setSelectedClub(freshClub),
      error: () => { /* garde la version en cache si l'API est indisponible */ }
    });
  }

  deleteClub(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getClubById(id: number): Observable<Club> {
    return this.http.get<Club>(`${this.apiUrl}/${id}`);
  }

  /** Demarre/reprend l'onboarding Stripe Connect d'un club, renvoie l'URL a ouvrir. */
  onboardClubStripe(clubId: number): Observable<{ onboardingUrl: string }> {
    return this.http.post<{ onboardingUrl: string }>(
      `${environment.apiUrl}/stripe/connect/club/${clubId}/onboard`, {}
    );
  }

  getClubStripeStatus(clubId: number): Observable<{ connected: boolean; chargesEnabled: boolean }> {
    return this.http.get<{ connected: boolean; chargesEnabled: boolean }>(
      `${environment.apiUrl}/stripe/connect/club/${clubId}/status`
    );
  }

  getClubs(): Observable<Club[]> {
    return this.http.get<Club[]>(this.apiUrl);
  }

  createClub(payload: Partial<Club>): Observable<Club> {
    return this.http.post<Club>(this.apiUrl, payload);
  }

  editClub(club: Club): Observable<Club> {
    return this.http.put<Club>(`${this.apiUrl}/${club.id}`, club);
  }

  uploadLogo(file: File): Observable<{ path: string }> {
    const form = new FormData();
    form.append('logo', file);
    return this.http.post<{ path: string }>(`${this.apiUrl}/upload-logo`, form);
  }

  getSelectedClub(): Club | null {
    const club = localStorage.getItem('selectedClub');
    if (!club) {
      return null;
    }

    try {
      return JSON.parse(club);
    } catch (error) {
      console.warn('[ClubService] selectedClub invalide en localStorage, suppression automatique.', error);
      localStorage.removeItem('selectedClub');
      return null;
    }
  }

  getClubVilleLabel(club: Club | null | undefined): string {
    const label = (club?.ville || club?.name || club?.nom || '').trim();
    return label.replace(/^Olympique\s+Taekwondo\s+/i, '').trim();
  }

  setSelectedClub(club: Club): void {
    localStorage.setItem('selectedClub', JSON.stringify(club));
    this.selectedClubSubject.next(club);
  }

  clearSelectedClub(): void {
    localStorage.removeItem('selectedClub');
    this.selectedClubSubject.next(null);
  }
}
