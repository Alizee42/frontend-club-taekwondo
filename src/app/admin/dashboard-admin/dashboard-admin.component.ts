import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, forkJoin, interval, Subject } from 'rxjs';
import { map, catchError, takeUntil, switchMap, filter, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { ClubService } from '../../services/club.service';
import { DashboardNavCardComponent } from '../../dashboard/shared/dashboard-nav-card/dashboard-nav-card.component';

interface DashboardStats {
  nbMembres: number;
  totalPaiements: number;
  paiementsAttente: number;
  evenementsAVenir: number;
}

type BadgeCounts = {
  avis: number;
  paiements: number;
  commandes: number;
  documents: number;
  horaires: number;
  actualites: number;
};


// 🔖 centralise ici les statuts (adapte si besoin pour coller à ton backend)
const STATUS = {
  AVIS_NON_APPROUVE: 'false',            // query ?approuve=false
  PAIEMENT_EN_ATTENTE: 'EN_ATTENTE',     // normalisation
  // 'A_TRAITER' n'existe pas côté backend (valeurs réelles : EN_ATTENTE, PAYEE, A_RETIRER, ANNULEE)
  // — ce badge était donc toujours à 0 avant cette correction.
  COMMANDE_A_TRAITER: 'EN_ATTENTE'
};

@Component({
  selector: 'app-dashboard-admin',
  standalone: true,
  imports: [CommonModule, DashboardNavCardComponent],
  templateUrl: './dashboard-admin.component.html',
  styleUrls: ['./dashboard-admin.component.css']
})
export class DashboardAdminComponent implements OnInit, OnDestroy {
  private lastSelectedClubId: number | null = null;

  // Loading state
  loading = true;

  // Date du jour
  today = new Date();

  // KPIs
  nbMembres = 0;
  totalPaiements = 0;
  paiementsAttente = 0;
  paiementsEnRetard = 0;
  paiementsEnAttenteSeul = 0;
  evenementsAVenir = 0;

  // Badges (affichés dans l'UI)
  badge: BadgeCounts = { avis: 0, paiements: 0, commandes: 0, documents: 0, horaires: 0, actualites: 0 };

  // Compteurs courants (ce que renvoie l'API pour chaque section)
  private currentCounts: BadgeCounts = { avis: 0, paiements: 0, commandes: 0, documents: 0, horaires: 0, actualites: 0 };

  // Bonjour
  prenomUtilisateur = 'Admin';

    adminName: string = '';

    /** Affiche le nom/prénom si ADMIN, sinon 'Super Admin' ou 'Utilisateur' + logs debug */
    getUserName(): string {
      try {
        const user = this.authService.getUtilisateurConnecte();
  // ...log supprimé...
        if (user && user.role) {
          const role = (user.role ?? this.authService.getRole() ?? '').toString().toUpperCase();
          // ...log supprimé...
          if (role === 'ADMIN') {
            // ...log supprimé...
            return user.prenom || '';
          }
          if (role === 'SUPER_ADMIN') {
            // ...log supprimé...
            return 'Super Admin';
          }
        }
  // ...log supprimé...
        return 'Utilisateur';
      } catch (e) {
  // ...log supprimé...
        return 'Utilisateur';
      }
    }

    ngOnInit(): void {
      this.recupererUtilisateur();
      this.chargerStats();
      this.refreshBadges();
      this.fetchAdminNameForSelectedClub();
      this.lastSelectedClubId = this.clubService.getSelectedClub()?.id ?? null;

      this.clubService.selectedClub$
        .pipe(takeUntil(this.destroy$))
        .subscribe(club => {
          const clubId = club?.id ?? null;
          if (clubId === this.lastSelectedClubId) {
            return;
          }

          this.lastSelectedClubId = clubId;
          this.refreshBadges();
          this.fetchAdminNameForSelectedClub();
        });

      interval(30000).pipe(takeUntil(this.destroy$)).subscribe(() => {
        this.refreshBadges();
      });

      this.router.events
        .pipe(filter(e => e instanceof NavigationEnd), takeUntil(this.destroy$))
        .subscribe((e: any) => {
          this.fetchAdminNameForSelectedClub();
        });
    }

    /** Appelle l'API pour récupérer l'admin du club sélectionné */
    fetchAdminNameForSelectedClub(): void {
      const club = this.clubService.getSelectedClub();
      if (club && club.id) {
          this.http.get<any[]>(`${environment.apiUrl}/utilisateurs?role=ADMIN&clubId=${club.id}`).subscribe({
            next: (admins) => {
              if (admins && admins.length > 0) {
                const admin = admins[0];
                this.adminName = `${admin.prenom || ''} ${admin.nom || ''}`.trim();
              } else {
                this.adminName = 'Admin';
              }
            },
            error: () => {
              this.adminName = 'Admin';
            }
          });
        } else {
          this.adminName = 'Admin';
        }
    }
  private destroy$ = new Subject<void>();

  // ✅ Base API root (évite les 404 sur /admin/...)
  private readonly base = environment.apiUrl;
  private url = (path: string) => `${this.base}/${String(path).replace(/^\/+/, '')}`;

  constructor(private http: HttpClient, private router: Router, private authService: AuthService, private clubService: ClubService) {}

  // ...existing code...

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Utilisateur connecté (depuis localStorage ici) */
  private recupererUtilisateur(): void {
    try {
      const user = this.authService.getUtilisateurConnecte();
      this.prenomUtilisateur = (user?.prenom ?? user?.nom ?? 'Admin');
    } catch {
      this.prenomUtilisateur = 'Admin';
    }
  }

  /** KPIs dashboard (tes stats globales) */
  private chargerStats(): void {
    this.http.get<DashboardStats>(this.url('dashboard/admin')).subscribe({
      next: (data) => {
        this.nbMembres = data?.nbMembres ?? 0;
        this.totalPaiements = data?.totalPaiements ?? 0;
        this.paiementsAttente = data?.paiementsAttente ?? 0;
        this.evenementsAVenir = data?.evenementsAVenir ?? 0;
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Erreur chargement stats dashboard', err);
        this.loading = false;
      }
    });
  }

  /** Centralisation des compteurs pour badges */
  private refreshBadges(): void {

    forkJoin({
      avis: this.fetchAvis(),
      paiements: this.fetchPaiements(),
      commandes: this.fetchCommandes(),
      documents: this.fetchDocuments(),
      horaires: this.fetchHoraires(),
      actualites: this.fetchActualites()
    }).subscribe({
      next: (res) => {
        this.currentCounts = {
          avis: Number(res.avis || 0),
          paiements: Number(res.paiements.enRetard + res.paiements.enAttenteSeul || 0),
          commandes: Number(res.commandes || 0),
          documents: Number(res.documents || 0),
          horaires: Number(res.horaires || 0),
          actualites: Number(res.actualites || 0)
        };
        this.badge = { ...this.currentCounts };
        this.paiementsEnRetard = res.paiements.enRetard;
        this.paiementsEnAttenteSeul = res.paiements.enAttenteSeul;
      },
      error: (err) => {
        console.error('❌ Erreur lors du refresh des badges:', err);
      }
    });
  }

  get paiementsBadgeLabel(): string | null {
    const parts: string[] = [];
    if (this.paiementsEnRetard > 0) parts.push(`${this.paiementsEnRetard} en retard`);
    if (this.paiementsEnAttenteSeul > 0) parts.push(`${this.paiementsEnAttenteSeul} en attente`);
    return parts.length > 0 ? parts.join(' · ') : null;
  }

  get paiementsBadgeVariant(): 'danger' | 'warning' | 'neutral' {
    if (this.paiementsEnRetard > 0) return 'danger';
    if (this.paiementsEnAttenteSeul > 0) return 'warning';
    return 'neutral';
  }

  // ===== Requêtes directes (filtrées) =====

  /** Avis non approuvés UNIQUEMENT */
  private fetchAvis(): Observable<number> {
    const params = new HttpParams().set('approuve', STATUS.AVIS_NON_APPROUVE);
    return this.http.get<any[]>(this.url('avis'), { params }).pipe(
      map(list => {
        const count = Array.isArray(list) ? list.filter(a => a?.approuve === false).length : 0;
        return count;
      }),
      catchError((err) => {
        console.error('❌ Erreur récupération avis:', err);
        return of(0);
      })
    );
  }

  /** Paiements en attente, séparés en "en retard" (échéance dépassée) / "pas encore échu" (robuste: /filter → fallback /api/paiements) */
  private fetchPaiements(): Observable<{ enRetard: number; enAttenteSeul: number }> {
    const params = new HttpParams().set('statut', STATUS.PAIEMENT_EN_ATTENTE);
    const filtered$ = this.http.get<any[]>(this.url('paiements/filter'), { params });
    const all$ = this.http.get<any[]>(this.url('paiements'));

    return filtered$.pipe(
      catchError(() => {
        return all$;
      }),
      switchMap(list => {
        const split = this.splitPaiementsEnAttente(list);
        if (split.enRetard + split.enAttenteSeul > 0) return of(split);
        return all$.pipe(map(all => this.splitPaiementsEnAttente(all)));
      }),
      catchError((err) => {
        console.error('❌ Erreur récupération paiements:', err);
        return of({ enRetard: 0, enAttenteSeul: 0 });
      })
    );
  }

  /** Sépare les paiements en attente entre ceux ayant une échéance dépassée et les autres. */
  private splitPaiementsEnAttente(list: any[]): { enRetard: number; enAttenteSeul: number } {
    const enAttente = Array.isArray(list) ? list.filter(p => this.isPaiementEnAttente(p?.statut)) : [];
    const aujourdHui = new Date();
    let enRetard = 0;
    let enAttenteSeul = 0;
    enAttente.forEach(p => {
      const echeances = Array.isArray(p?.echeances) ? p.echeances : [];
      const aUneEcheanceEnRetard = echeances.some((e: any) =>
        this.isPaiementEnAttente(e?.statut) && e?.dateEcheance && new Date(e.dateEcheance) < aujourdHui
      );
      if (aUneEcheanceEnRetard) enRetard++;
      else enAttenteSeul++;
    });
    return { enRetard, enAttenteSeul };
  }

  /** Commandes à traiter UNIQUEMENT */
  private fetchCommandes(): Observable<number> {
    const params = new HttpParams().set('statut', STATUS.COMMANDE_A_TRAITER);
    return this.http.get<any[]>(this.url('commandes'), { params }).pipe(
      map(list => {
        const count = Array.isArray(list) ? list.filter(c => this.norm(c?.statut) === this.norm(STATUS.COMMANDE_A_TRAITER)).length : 0;
        return count;
      }),
      catchError((err) => {
        console.error('❌ Erreur récupération commandes:', err);
        return of(0);
      })
    );
  }

  /** Documents en attente de validation (endpoint dédié, scopé au club de l'admin par le backend). */
  private fetchDocuments(): Observable<number> {
    return this.http.get<any[]>(this.url('documents/en-attente')).pipe(
      map(list => Array.isArray(list) ? list.length : 0),
      catchError((err) => {
        console.error('❌ Erreur récupération documents:', err);
        return of(0);
      })
    );
  }

  /** Horaires du club sélectionné. */
  private fetchHoraires(): Observable<number> {
    const club = this.clubService.getSelectedClub();
    if (!club?.id) {
      return of(0);
    }

    return this.http.get<any[]>(this.url(`horaires/club/${club.id}`)).pipe(
      map(list => Array.isArray(list) ? list.length : 0),
      catchError((err) => {
        console.error('❌ Erreur récupération horaires:', err);
        return of(0);
      })
    );
  }

  /** Actualités (total récent). */
  private fetchActualites(): Observable<number> {
    const club = this.clubService.getSelectedClub();
    const endpoint = club?.id ? this.url(`actualites/club/${club.id}`) : this.url('actualites');

    return this.http.get<any[]>(endpoint).pipe(
      timeout(3000),
      map(list => {
        const count = Array.isArray(list) ? list.length : 0;
        return count;
      }),
      catchError((err) => {
        console.error('❌ Erreur récupération actualités:', err);
        return of(0);
      })
    );
  }

  // —— Helpers de normalisation & comptage (paiements) ——
  private isPaiementEnAttente(statut: any): boolean {
    const s = this.norm(statut);
    return s === 'en attente'
        || s === 'en_attente'
        || s === 'en attente probation'
        || s === 'en attente de probation'
        || s === 'en_attente_probation'
        || s === 'pending'
        || s === this.norm(STATUS.PAIEMENT_EN_ATTENTE); // couvre 'EN_ATTENTE'
  }

  private norm(v: any): string {
    return String(v ?? '').toLowerCase().replace(/[_-]+/g, ' ').trim();
  }

  // 🚀 Navigation
  navigateToPaiement(): void {
    this.router.navigate(['/admin/paiements']);
  }

  navigateToDocument(): void {
    this.router.navigate(['/admin/documents']);
  }

  navigateToGestionCommande(): void {
    this.router.navigate(['/admin/gestion-commande']);
  }

  navigateToGestionProduits(): void {
    this.router.navigate(['/admin/gestion-produits']);
  }

  navigateToavis(): void {
    this.router.navigate(['/admin/avis']);
  }

  // Sections sans badge
  navigateToGestionEvenements(): void {
    this.router.navigate(['/admin/gestion-evenement']);
  }

  navigateToGalerie(): void {
    this.router.navigate(['/admin/galerie']);
  }

  navigateToProfesseurs(): void {
    this.router.navigate(['/admin/professeurs']);
  }

  navigateToHoraires(): void {
    this.router.navigate(['/admin/horaires']);
  }

  navigateToActualites(): void {
    this.router.navigate(['/admin/actualites']);
  }

  navigateToGestionMembres(): void {
    this.router.navigate(['/admin/membres']);
  }

  navigateToAccueilSite(): void {
    this.router.navigate(['/admin/accueil-site']);
  }
}
