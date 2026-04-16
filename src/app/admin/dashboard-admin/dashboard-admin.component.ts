import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, forkJoin, interval, Subject } from 'rxjs';
import { map, catchError, takeUntil, switchMap, filter } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { ClubService } from '../../services/club.service';

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
  actualites: number;
};


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
  avis: 'last_seen_avis',
  actualites: 'last_seen_actualites'
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

  // Loading state
  loading = true;

  // Date du jour
  today = new Date();

  // KPIs
  nbMembres = 0;
  totalPaiements = 0;
  paiementsAttente = 0;
  evenementsAVenir = 0;

  // Badges (affichés dans l'UI)
  badge: BadgeCounts = { avis: 0, paiements: 0, inscriptions: 0, commandes: 0, documents: 0, actualites: 0 };

  // Compteurs courants (ce que renvoie l'API pour chaque section)
  private currentCounts: BadgeCounts = { avis: 0, paiements: 0, inscriptions: 0, commandes: 0, documents: 0, actualites: 0 };

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

      interval(30000).pipe(takeUntil(this.destroy$)).subscribe(() => {
        this.refreshBadges();
      });

      this.applyMarkAsSeenForUrl(this.router.url);

      this.router.events
        .pipe(filter(e => e instanceof NavigationEnd), takeUntil(this.destroy$))
        .subscribe((e: any) => {
          this.applyMarkAsSeenForUrl(e?.urlAfterRedirects ?? e?.url ?? '');
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
      inscriptions: this.fetchInscriptions(), 
      commandes: this.fetchCommandes(),     
      documents: this.fetchDocuments(),
      actualites: this.fetchActualites()      
    }).subscribe({
      next: (res) => {
        
        // Mémorise les valeurs courantes renvoyées par l'API
        this.currentCounts = {
          avis: Number(res.avis || 0),
          paiements: Number(res.paiements || 0),
          inscriptions: Number(res.inscriptions || 0),
          commandes: Number(res.commandes || 0),
          documents: Number(res.documents || 0),
          actualites: Number(res.actualites || 0)
        };


        // Calcule les badges = max(0, courant - dernierVu)
        const newBadges = {
          avis: this.computeUnread('avis', this.currentCounts.avis),
          paiements: this.computeUnread('paiements', this.currentCounts.paiements),
          inscriptions: this.computeUnread('inscriptions', this.currentCounts.inscriptions),
          commandes: this.computeUnread('commandes', this.currentCounts.commandes),
          documents: this.computeUnread('documents', this.currentCounts.documents),
          actualites: this.computeUnread('actualites', this.currentCounts.actualites)
        };

        
        // Détecte les changements pour logger
        Object.keys(newBadges).forEach(key => {
          const sectionKey = key as SectionKey;
          if (this.badge[sectionKey] !== newBadges[sectionKey]) {
          }
        });

        this.badge = newBadges;
      },
      error: (err) => {
        console.error('❌ Erreur lors du refresh des badges:', err);
      }
    });
  }

  /** Calcule le non-lu pour une section */
  private computeUnread(section: SectionKey, current: number): number {
    const lastRaw = localStorage.getItem(LS_KEYS[section]);
    
    if (lastRaw === null) {
      // 1er chargement → on considère "tout vu" pour éviter les faux positifs
      try { 
        localStorage.setItem(LS_KEYS[section], String(current)); 
      } catch (e) {
        console.warn('⚠️ Erreur localStorage:', e);
      }
      return 0;
    }
    
    const last = parseInt(lastRaw, 10) || 0;
    const unread = Math.max(0, current - last);
    
    return unread;
  }

  /** Marque la section comme vue (badge=0 et stockage du "dernier vu") */
  private markSectionAsSeen(section: SectionKey): void {
    const currentCount = this.currentCounts[section];
    
    try { 
      localStorage.setItem(LS_KEYS[section], String(currentCount)); 
    } catch (e) {
      console.warn(`⚠️ Erreur sauvegarde localStorage pour ${section}:`, e);
    }
    
    // Reset du badge immédiatement
    this.badge = { ...this.badge, [section]: 0 };
  }

  /** Marquage automatique en fonction de l'URL atteinte */
  private applyMarkAsSeenForUrl(url: string): void {
    if (!url) return;
    
    // Adapte ces routes si tes paths diffèrent
    if (url.startsWith('/admin/paiements')) {
      this.markSectionAsSeen('paiements');
    }
    if (url.startsWith('/admin/documents')) {
      this.markSectionAsSeen('documents');
    }
    if (url.startsWith('/admin/gestion-commande')) {
      this.markSectionAsSeen('commandes');
    }
    if (url.startsWith('/admin/gestion-inscription') || url.startsWith('/admin/inscriptions')) {
      this.markSectionAsSeen('inscriptions');
    }
    if (url.startsWith('/admin/avis')) {
      this.markSectionAsSeen('avis');
    }
    if (url.startsWith('/admin/actualites')) {
      this.markSectionAsSeen('actualites');
    }
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

  /** Paiements en attente (robuste: /filter → fallback /api/paiements) */
  private fetchPaiements(): Observable<number> {
    const params = new HttpParams().set('statut', STATUS.PAIEMENT_EN_ATTENTE);
    const filtered$ = this.http.get<any[]>(this.url('paiements/filter'), { params });
    const all$ = this.http.get<any[]>(this.url('paiements'));

    return filtered$.pipe(
      catchError(() => {
        return all$;
      }),
      switchMap(list => {
        const count = this.countPendingPaiements(list);
        if (count > 0) return of(count);
        return all$.pipe(map(all => {
          const fallbackCount = this.countPendingPaiements(all);
          return fallbackCount;
        }));
      }),
      catchError((err) => {
        console.error('❌ Erreur récupération paiements:', err);
        return of(0);
      })
    );
  }

  /** Inscriptions en attente de probation UNIQUEMENT */
  private fetchInscriptions(): Observable<number> {
    const params = new HttpParams().set('statut', STATUS.INSCRIPTION_EN_ATTENTE);
    return this.http.get<any[]>(this.url('inscriptions'), { params }).pipe(
      map(list => {
        const count = Array.isArray(list) ? list.filter(i => this.norm(i?.statut) === this.norm(STATUS.INSCRIPTION_EN_ATTENTE)).length : 0;
        return count;
      }),
      catchError((err) => {
        console.error('❌ Erreur récupération inscriptions:', err);
        return of(0);
      })
    );
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

  /** Documents (par défaut : total). Si tu as un statut "à valider", filtre-le ici. */
  private fetchDocuments(): Observable<number> {
    // 👉 Si tu as un statut spécifique (ex: ?statut=A_VALIDER), adapte ci-dessous.
    return this.http.get<any[]>(this.url('documents')).pipe(
      map(list => {
        const count = Array.isArray(list) ? list.length : 0;
        return count;
      }),
      catchError((err) => {
        console.error('❌ Erreur récupération documents:', err);
        return of(0);
      })
    );
  }

  /** Actualités (total récent). */
  private fetchActualites(): Observable<number> {
    return this.http.get<any[]>(this.url('actualites')).pipe(
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
  navigateToPaiement(): void {
    this.markSectionAsSeen('paiements');
    this.router.navigate(['/admin/paiements']);
  }

  navigateToDocument(): void {
    this.markSectionAsSeen('documents');
    this.router.navigate(['/admin/documents']);
  }

  navigateToGestionCommande(): void {
    this.markSectionAsSeen('commandes');
    this.router.navigate(['/admin/gestion-commande']);
  }

  navigateToGestionInscription(): void {
    this.markSectionAsSeen('inscriptions');
    this.router.navigate(['/admin/gestion-inscription']);
  }

  navigateToavis(): void {
    this.markSectionAsSeen('avis');
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
    this.markSectionAsSeen('actualites');
    this.router.navigate(['/admin/actualites']);
  }

    navigateToGestionUtilisateurs(): void {
      this.router.navigate(['/admin/gestion-utilisateurs']);
    }

    navigateToMembresAdmin() {
      this.router.navigate(['/admin/membres']);
    }
}
