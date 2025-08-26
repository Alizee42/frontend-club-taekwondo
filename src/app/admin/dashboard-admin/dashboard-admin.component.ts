import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { HttpClient, HttpClientModule, HttpParams } from '@angular/common/http';
import { Observable, of, forkJoin, interval, Subject } from 'rxjs';
import { map, catchError, takeUntil, switchMap, filter } from 'rxjs/operators';

interface DashboardStats {
  nbMembres: number;
  totalPaiements: number;
  paiementsAttente: number;
  evenementsAVenir: number;
}

type BadgeCounts = {
  avis: number;
  paiements: number;
  inscriptions: number;
  commandes: number;
};

type UserLocalStorage = { prenom?: string; nom?: string } | null;

// 🔖 centralise ici les statuts (change si besoin)
const STATUS = {
  AVIS_NON_APPROUVE: 'false',            // query ?approuve=false
  PAIEMENT_EN_ATTENTE: 'EN_ATTENTE',     // si ton backend est "en attente", on gère via normalisation
  INSCRIPTION_EN_ATTENTE: 'EN_ATTENTE_PROBATION',
  COMMANDE_A_TRAITER: 'A_TRAITER'
};

// 🔒 clés de persistance locale
const LS_KEYS = {
  lastSeenPendingPaiements: 'last_seen_pending_paiements'
};

@Component({
  selector: 'app-dashboard-admin',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './dashboard-admin.component.html',
  styleUrls: ['./dashboard-admin.component.css']
})
export class DashboardAdminComponent implements OnInit, OnDestroy {

  // KPIs
  nbMembres = 0;
  totalPaiements = 0;
  paiementsAttente = 0;
  evenementsAVenir = 0;

  // Badges
  badge: BadgeCounts = { avis: 0, paiements: 0, inscriptions: 0, commandes: 0 };

  // Bonjour
  prenomUtilisateur = 'Admin';

  private destroy$ = new Subject<void>();

  // pour calcul "non lus"
  private lastPendingPaiements = 0; // dernier total "en attente" vu du serveur

  // ✅ Base API root-absolu (évite les 404 sur /admin/...)
  private readonly base = '/api'.replace(/\/+$/, '');
  private url = (path: string) => `${this.base}/${String(path).replace(/^\/+/, '')}`;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.recupererUtilisateur();
    this.chargerStats();
    this.refreshBadges();

    // rafraîchit périodiquement
    interval(30000).pipe(takeUntil(this.destroy$)).subscribe(() => this.refreshBadges());

    // si on est DÉJÀ sur /admin/paiements au chargement → badge à 0
    if (this.router.url.startsWith('/admin/paiements')) {
      this.markPaiementsAsSeen();
    }

    // à chaque navigation vers /admin/paiements → badge à 0
    this.router.events
      .pipe(
        filter(e => e instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((e: any) => {
        const url = e?.urlAfterRedirects ?? e?.url ?? '';
        if (url.startsWith('/admin/paiements')) {
          this.markPaiementsAsSeen();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Utilisateur connecté (depuis localStorage ici) */
  private recupererUtilisateur(): void {
    try {
      const raw = localStorage.getItem('user');
      const user: UserLocalStorage = raw ? JSON.parse(raw) : null;
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
      },
      error: (err) => console.error('❌ Erreur chargement stats dashboard', err)
    });
  }

  /** Centralisation des compteurs pour badges */
  private refreshBadges(): void {
    forkJoin({
      avis: this.fetchAvis(),
      paiements: this.fetchPaiements(),          // renvoie le TOTAL "en attente"
      inscriptions: this.fetchInscriptions(),
      commandes: this.fetchCommandes()
    }).subscribe({
      next: (res) => {
        // ----- calcul des "non lus" pour Paiements -----
        const pending = Number(res.paiements || 0);
        this.lastPendingPaiements = pending;

        const lastSeenRaw = localStorage.getItem(LS_KEYS.lastSeenPendingPaiements);
        let unread: number;

        if (lastSeenRaw === null) {
          // 1er chargement : on considère tout "vu" (badge = 0)
          localStorage.setItem(LS_KEYS.lastSeenPendingPaiements, String(pending));
          unread = 0;
        } else {
          const lastSeen = parseInt(lastSeenRaw, 10) || 0;
          unread = Math.max(0, pending - lastSeen);
        }

        this.badge = {
          avis: res.avis,
          inscriptions: res.inscriptions,
          commandes: res.commandes,
          paiements: unread
        };
      },
      error: () => { /* noop */ }
    });
  }

  /** Marque les paiements "en attente" comme vus → badge = 0 */
  private markPaiementsAsSeen(): void {
    localStorage.setItem(LS_KEYS.lastSeenPendingPaiements, String(this.lastPendingPaiements));
    // met immédiatement le badge à 0 pour l'UX
    this.badge = { ...this.badge, paiements: 0 };
  }

  // ===== Requêtes directes (filtrées) =====

  /** Avis non approuvés UNIQUEMENT */
  private fetchAvis(): Observable<number> {
    const params = new HttpParams().set('approuve', STATUS.AVIS_NON_APPROUVE);
    return this.http
      .get<any[]>(this.url('avis'), { params })
      .pipe(
        // fallback si l'API ignore le paramètre
        map(list => Array.isArray(list) ? list.filter(a => a?.approuve === false).length : 0),
        catchError(() => of(0))
      );
  }

  /** Paiements en attente UNIQUEMENT (robuste: /filter → fallback /api/paiements) */
  private fetchPaiements(): Observable<number> {
    const params = new HttpParams().set('statut', STATUS.PAIEMENT_EN_ATTENTE);
    const filtered$ = this.http.get<any[]>(this.url('paiements/filter'), { params });
    const all$ = this.http.get<any[]>(this.url('paiements'));

    return filtered$.pipe(
      // si /filter n'existe pas → fallback
      catchError(() => all$),
      // si /filter répond mais libellé différent → re-teste via /api/paiements + filtrage front
      switchMap(list => {
        const count = this.countPendingPaiements(list);
        if (count > 0) return of(count);
        return all$.pipe(map(all => this.countPendingPaiements(all)));
      }),
      catchError(() => of(0))
    );
  }

  /** Inscriptions en attente de probation UNIQUEMENT */
  private fetchInscriptions(): Observable<number> {
    const params = new HttpParams().set('statut', STATUS.INSCRIPTION_EN_ATTENTE);
    return this.http
      .get<any[]>(this.url('inscriptions'), { params })
      .pipe(
        map(list => Array.isArray(list) ? list.filter(i => this.norm(i?.statut) === this.norm(STATUS.INSCRIPTION_EN_ATTENTE)).length : 0),
        catchError(() => of(0))
      );
  }

  /** Commandes à traiter UNIQUEMENT */
  private fetchCommandes(): Observable<number> {
    const params = new HttpParams().set('statut', STATUS.COMMANDE_A_TRAITER);
    return this.http
      .get<any[]>(this.url('commandes'), { params })
      .pipe(
        map(list => Array.isArray(list) ? list.filter(c => this.norm(c?.statut) === this.norm(STATUS.COMMANDE_A_TRAITER)).length : 0),
        catchError(() => of(0))
      );
  }

  // —— Helpers de normalisation & comptage (paiements) ——
  private countPendingPaiements(list: any[]): number {
    if (!Array.isArray(list)) return 0;
    return list.filter(p => this.isPaiementEnAttente(p?.statut)).length;
  }

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
  navigateToPaiement() {
    this.markPaiementsAsSeen();               // retire le badge immédiatement au clic
    this.router.navigate(['/admin/paiements']);
  }
  navigateToGestionCommande()    { this.router.navigate(['/admin/gestion-commande']); }
  navigateToGestionEvenements()  { this.router.navigate(['/admin/gestion-evenement']); }
  navigateToGestionInscription() { this.router.navigate(['/admin/gestion-inscription']); }
  navigateToavis()               { this.router.navigate(['/admin/avis']); }
  navigateToActualites()         { this.router.navigate(['/admin/actualites']); }
  navigateToGalerie()            { this.router.navigate(['/admin/galerie']); }
  navigateToDocument()           { this.router.navigate(['/admin/documents']); }
  navigateToProfesseurs()        { this.router.navigate(['/admin/professeurs']); }
  navigateToHoraires()           { this.router.navigate(['/admin/horaires']); }
}
