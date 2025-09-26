import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, forkJoin, interval, Subject } from 'rxjs';
import { map, catchError, takeUntil, switchMap, filter } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

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
  documents: number;
};

type UserLocalStorage = { prenom?: string; nom?: string } | null;

// 🔖 centralise ici les statuts (adapte si besoin pour coller à ton backend)
const STATUS = {
  AVIS_NON_APPROUVE: 'false',            // query ?approuve=false
  PAIEMENT_EN_ATTENTE: 'EN_ATTENTE',     // normalisation
  INSCRIPTION_EN_ATTENTE: 'EN_ATTENTE_PROBATION',
  COMMANDE_A_TRAITER: 'A_TRAITER'
};

// 🔒 clés de persistance locale (par section)
const LS_KEYS = {
  paiements: 'last_seen_pending_paiements',
  documents: 'last_seen_documents',
  inscriptions: 'last_seen_inscriptions',
  commandes: 'last_seen_commandes',
  avis: 'last_seen_avis'
} as const;

type SectionKey = keyof typeof LS_KEYS;

@Component({
  selector: 'app-dashboard-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-admin.component.html',
  styleUrls: ['./dashboard-admin.component.css']
})
export class DashboardAdminComponent implements OnInit, OnDestroy {

  // KPIs
  nbMembres = 0;
  totalPaiements = 0;
  paiementsAttente = 0;
  evenementsAVenir = 0;

  // Badges (affichés dans l'UI)
  badge: BadgeCounts = { avis: 0, paiements: 0, inscriptions: 0, commandes: 0, documents: 0 };

  // Compteurs courants (ce que renvoie l’API pour chaque section)
  private currentCounts: BadgeCounts = { avis: 0, paiements: 0, inscriptions: 0, commandes: 0, documents: 0 };

  // Bonjour
  prenomUtilisateur = 'Admin';

  private destroy$ = new Subject<void>();

  // ✅ Base API root (évite les 404 sur /admin/...)
  private readonly base = environment.apiUrl;
  private url = (path: string) => `${this.base}/${String(path).replace(/^\/+/, '')}`;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.recupererUtilisateur();
    this.chargerStats();
    this.refreshBadges();

    // rafraîchit périodiquement
    interval(30000).pipe(takeUntil(this.destroy$)).subscribe(() => this.refreshBadges());

    // Si on arrive déjà sur une route cible → marquer comme vu
    this.applyMarkAsSeenForUrl(this.router.url);

    // À chaque navigation, marquer si on entre dans une section
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd), takeUntil(this.destroy$))
      .subscribe((e: any) => this.applyMarkAsSeenForUrl(e?.urlAfterRedirects ?? e?.url ?? ''));
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
      avis: this.fetchAvis(),               // total avis non approuvés
      paiements: this.fetchPaiements(),     // total paiements en attente
      inscriptions: this.fetchInscriptions(), // total inscriptions en attente
      commandes: this.fetchCommandes(),     // total commandes à traiter
      documents: this.fetchDocuments()      // total documents (ou non traités si tu as un statut)
    }).subscribe({
      next: (res) => {
        // Mémorise les valeurs courantes renvoyées par l'API
        this.currentCounts = {
          avis: Number(res.avis || 0),
          paiements: Number(res.paiements || 0),
          inscriptions: Number(res.inscriptions || 0),
          commandes: Number(res.commandes || 0),
          documents: Number(res.documents || 0)
        };

        // Calcule les badges = max(0, courant - dernierVu)
        this.badge = {
          avis: this.computeUnread('avis', this.currentCounts.avis),
          paiements: this.computeUnread('paiements', this.currentCounts.paiements),
          inscriptions: this.computeUnread('inscriptions', this.currentCounts.inscriptions),
          commandes: this.computeUnread('commandes', this.currentCounts.commandes),
          documents: this.computeUnread('documents', this.currentCounts.documents)
        };
      },
      error: () => { /* noop */ }
    });
  }

  /** Calcule le non-lu pour une section */
  private computeUnread(section: SectionKey, current: number): number {
    const lastRaw = localStorage.getItem(LS_KEYS[section]);
    if (lastRaw === null) {
      // 1er chargement → on considère "tout vu"
      try { localStorage.setItem(LS_KEYS[section], String(current)); } catch {}
      return 0;
    }
    const last = parseInt(lastRaw, 10) || 0;
    return Math.max(0, current - last);
  }

  /** Marque la section comme vue (badge=0 et stockage du “dernier vu”) */
  private markSectionAsSeen(section: SectionKey): void {
    try { localStorage.setItem(LS_KEYS[section], String(this.currentCounts[section])); } catch {}
    this.badge = { ...this.badge, [section]: 0 };
  }

  /** Marquage automatique en fonction de l’URL atteinte */
  private applyMarkAsSeenForUrl(url: string): void {
    if (!url) return;
    // Adapte ces routes si tes paths diffèrent
    if (url.startsWith('/admin/paiements')) this.markSectionAsSeen('paiements');
    if (url.startsWith('/admin/documents')) this.markSectionAsSeen('documents');
    if (url.startsWith('/admin/gestion-commande')) this.markSectionAsSeen('commandes');
    if (url.startsWith('/admin/gestion-inscription') || url.startsWith('/admin/inscriptions')) this.markSectionAsSeen('inscriptions');
    if (url.startsWith('/admin/avis')) this.markSectionAsSeen('avis');
  }

  // ===== Requêtes directes (filtrées) =====

  /** Avis non approuvés UNIQUEMENT */
  private fetchAvis(): Observable<number> {
    const params = new HttpParams().set('approuve', STATUS.AVIS_NON_APPROUVE);
    return this.http.get<any[]>(this.url('avis'), { params }).pipe(
      map(list => Array.isArray(list) ? list.filter(a => a?.approuve === false).length : 0),
      catchError(() => of(0))
    );
  }

  /** Paiements en attente (robuste: /filter → fallback /api/paiements) */
  private fetchPaiements(): Observable<number> {
    const params = new HttpParams().set('statut', STATUS.PAIEMENT_EN_ATTENTE);
    const filtered$ = this.http.get<any[]>(this.url('paiements/filter'), { params });
    const all$ = this.http.get<any[]>(this.url('paiements'));

    return filtered$.pipe(
      catchError(() => all$),
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
    return this.http.get<any[]>(this.url('inscriptions'), { params }).pipe(
      map(list => Array.isArray(list) ? list.filter(i => this.norm(i?.statut) === this.norm(STATUS.INSCRIPTION_EN_ATTENTE)).length : 0),
      catchError(() => of(0))
    );
  }

  /** Commandes à traiter UNIQUEMENT */
  private fetchCommandes(): Observable<number> {
    const params = new HttpParams().set('statut', STATUS.COMMANDE_A_TRAITER);
    return this.http.get<any[]>(this.url('commandes'), { params }).pipe(
      map(list => Array.isArray(list) ? list.filter(c => this.norm(c?.statut) === this.norm(STATUS.COMMANDE_A_TRAITER)).length : 0),
      catchError(() => of(0))
    );
  }

  /** Documents (par défaut : total). Si tu as un statut "à valider", filtre-le ici. */
  private fetchDocuments(): Observable<number> {
    // 👉 Si tu as un statut spécifique (ex: ?statut=A_VALIDER), adapte ci-dessous.
    return this.http.get<any[]>(this.url('documents')).pipe(
      map(list => Array.isArray(list) ? list.length : 0),
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

  // 🚀 Navigation (on marque la section comme vue AVANT de naviguer)
  navigateToPaiement()           { this.markSectionAsSeen('paiements');   this.router.navigate(['/admin/paiements']); }
  navigateToDocument()           { this.markSectionAsSeen('documents');   this.router.navigate(['/admin/documents']); }
  navigateToGestionCommande()    { this.markSectionAsSeen('commandes');   this.router.navigate(['/admin/gestion-commande']); }
  navigateToGestionInscription() { this.markSectionAsSeen('inscriptions');this.router.navigate(['/admin/gestion-inscription']); }
  navigateToavis()               { this.markSectionAsSeen('avis');        this.router.navigate(['/admin/avis']); }

  // Sections sans badge
  navigateToGestionEvenements()  { this.router.navigate(['/admin/gestion-evenement']); }
  navigateToGalerie()            { this.router.navigate(['/admin/galerie']); }
  navigateToProfesseurs()        { this.router.navigate(['/admin/professeurs']); }
  navigateToHoraires()           { this.router.navigate(['/admin/horaires']); }
  navigateToActualites()         { this.router.navigate(['/admin/actualites']); }
}
