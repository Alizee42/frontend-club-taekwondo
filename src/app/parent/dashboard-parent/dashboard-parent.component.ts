import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { environment } from '../../../environments/environment';
import { UiTitleComponent } from '../../shared/ui/title/ui-title.component';
import { AgePipe } from '../../pipes/age.pipe';
import { AuthService } from '../../services/auth.service';
import { ActualiteService } from '../../services/actualite.service';
import { ClubSelectionService } from '../../services/club-selection.service';
import { MembreService, Membre } from '../../services/membre.service';
import { EvenementService } from '../../services/evenement.service';
import { DashboardNavCardComponent } from '../../dashboard/shared/dashboard-nav-card/dashboard-nav-card.component';
import { KpiCardComponent } from '../../shared/ui/kpi-card/kpi-card.component';
import { KpiGridComponent } from '../../shared/ui/kpi-grid/kpi-grid.component';

interface Utilisateur {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  avatar?: string;
  telephone?: string;
}

@Component({
  selector: 'app-dashboard-parent',
  standalone: true,
  templateUrl: './dashboard-parent.component.html',
  styleUrls: ['./dashboard-parent.component.css'],
  imports: [CommonModule, AgePipe, DashboardNavCardComponent, KpiCardComponent, KpiGridComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardParentComponent implements OnInit, OnDestroy {
  utilisateurConnecte: Utilisateur | null = null;
  enfants: Membre[] = [];
  actualitesClub: any[] = [];
  alertsReady = false;
  stats = {
    paiementsEnRetard: 0,
    documentsManquants: 0, // À brancher sur l'API réelle
    commandesEnCours: 0,
    evenementsAVenir: 0
  };

  private authSubscription?: Subscription;
  private clubIdSubscription?: Subscription;

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    private actualiteService: ActualiteService,
    private clubSelectionService: ClubSelectionService,
    private membreService: MembreService,
    private evenementService: EvenementService,
    private cdr: ChangeDetectorRef
    ) {}

  // Référentiel des documents requis (même logique que documents-parent)
  private readonly DOC_CATALOG: Array<{ code: string; label: string; aliases?: string[] }> = [
    { code: 'CERTIFICAT_MEDICAL', label: 'Certificat médical (< 1 an)', aliases: ['CERTIF_MEDICAL','CERTIFICAT','MEDICAL'] },
    { code: 'PHOTO_IDENTITE',     label: "Photo d'identité",             aliases: ["PHOTO D'IDENTITE","PHOTO_IDENTITÉ","PHOTO","PHOTOGRAPHIE","PHOTO D'IDENTITÉ"] },
    { code: 'DOCUMENT_IDENTITE',  label: "Document d'identité",          aliases: ['PIECE_IDENTITE',"PIÈCE D'IDENTITÉ",'CARTE_IDENTITE',"CARTE D'IDENTITÉ",'CNI','PASSEPORT','JUSTIFICATIF_IDENTITE','JUSTIFICATIF IDENTITE'] }
  ];

  private unifyType(input: any): string {
    const raw = String(input || '').trim();
    if (!raw) return raw;
    if (this.DOC_CATALOG.some(t => t.code === raw)) return raw;
    const norm = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[\s''_-]+/g, '');
    for (const t of this.DOC_CATALOG) {
      const candidates = [t.code, t.label, ...(t.aliases || [])];
      if (candidates.some(c => String(c).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[\s''_-]+/g, '') === norm)) {
        return t.code;
      }
    }
    return raw;
  }

  private readonly API_BASE = environment.apiUrl;

  /** Génère les initiales à partir du prénom et nom */
  getInitials(prenom?: string, nom?: string): string {
    const p = (prenom || '').trim();
    const n = (nom || '').trim();
    if (!p && !n) return '?';
    return `${p[0] || ''}${n[0] || ''}`.toUpperCase();
  }

  /** Récupère le nombre réel de documents manquants pour tous les enfants */
  loadDocumentsManquants(): void {
    this.alertsReady = false;
    if (!this.enfants || this.enfants.length === 0) {
      console.log('[DOCS] Aucun enfant trouvé, aucun document manquant.');
      this.stats.documentsManquants = 0;
      this.alertsReady = true;
      this.cdr.detectChanges();
      return;
    }
    let totalManquants = 0;
    let processed = 0;
    this.enfants.forEach(enfant => {
      console.log(`[DOCS] Vérification des documents pour l'enfant #${enfant.id} (${enfant.prenom} ${enfant.nom})`);
      this.http.get<any[]>(`${this.API_BASE}/documents/membre/${enfant.id}`).subscribe({
        next: (docsRaw) => {
          const arr: any[] = Array.isArray(docsRaw) ? docsRaw
            : Array.isArray((docsRaw as any)?.items) ? (docsRaw as any).items
            : Array.isArray((docsRaw as any)?.data) ? (docsRaw as any).data
            : Array.isArray((docsRaw as any)?.results) ? (docsRaw as any).results
            : Array.isArray((docsRaw as any)?.documents) ? (docsRaw as any).documents
            : [];
          if (!arr || arr.length === 0) {
            console.log(`[DOCS] Aucun document transmis pour l'enfant #${enfant.id} → ${this.DOC_CATALOG.length} manquants.`);
            totalManquants += this.DOC_CATALOG.length;
          } else {
            const typesPossedes = new Set((arr || []).map(d => this.unifyType((d as any)?.typeDocument ?? (d as any)?.type ?? (d as any)?.code ?? (d as any)?.label)));
            const manquants = this.DOC_CATALOG.filter(t => !typesPossedes.has(t.code));
            console.log(`[DOCS] Documents transmis pour l'enfant #${enfant.id}:`, Array.from(typesPossedes));
            console.log(`[DOCS] Documents manquants pour l'enfant #${enfant.id}:`, manquants.map(m => m.code));
            totalManquants += manquants.length;
          }
        },
        error: (err) => {
          console.warn(`[DOCS] Erreur lors de la récupération des documents pour l'enfant #${enfant.id} :`, err);
          totalManquants += this.DOC_CATALOG.length;
        },
        complete: () => {
          processed++;
          if (processed === this.enfants.length) {
            console.log(`[DOCS] Total global de documents manquants pour tous les enfants : ${totalManquants}`);
            this.stats.documentsManquants = totalManquants;
            this.alertsReady = true;
            this.cdr.detectChanges();
          }
        }
      });
    });
  }

  /* -------------------------------------------
     🧭 Navigation
  ------------------------------------------- */
  navigateToProfil(): void {
    this.router.navigate(['/profil']);
  }

  navigateToPaiements(): void {
    this.router.navigate(['/parent/paiements']);
  }

  navigateToDocuments(): void {
    this.router.navigate(['/parent/documents']);
  }

  navigateToCommandes(): void {
    this.router.navigate(['/parent/commandes']);
  }

  navigateToEvenements(): void {
    this.router.navigate(['/parent/evenements']);
  }

  navigateToSupport(): void {
    this.router.navigate(['/contact']);
  }

  goToActualite(id: number): void {
    this.router.navigate(['/actualite', id]);
  }

  /* -------------------------------------------
     🚀 Cycle de vie
  ------------------------------------------- */
  ngOnInit(): void {
    console.log('[👨‍👧 DASHBOARD PARENT] Initialisation...');
    const role = this.authService.getRole();
    if (role !== 'PARENT') {
      alert("Accès refusé. Vous n'êtes pas autorisé à accéder à cette section.");
      this.router.navigate(['/connexion']);
      return;
    }
    // Auth observable
    this.authSubscription = this.authService.authState$.subscribe(authState => {
      console.log('[👨‍👧 DASHBOARD PARENT] État auth reçu:', authState);
      if (authState.isConnecte && authState.user) {
        console.log('[👨‍👧 DASHBOARD PARENT] Utilisateur connecté depuis authState');
        this.utilisateurConnecte = authState.user as Utilisateur;
        // Charger les enfants réels du parent connecté
        this.membreService.getMembresPourParentConnecte().subscribe(enfants => {
          this.enfants = (enfants || []).map(e => ({
            ...e,
            avatar: e.avatar || '',
            dateNaissance: e.dateNaissance || '',
            ceinture: e.ceinture || ''
          }));
          // Appel du calcul des documents manquants uniquement après chargement effectif des enfants
          this.loadDocumentsManquants();
        });
  // Charger les événements à venir (réel)
  setTimeout(() => this.loadEvenementsAVenir(), 0);
  // Ne pas relancer loadDocumentsManquants ici pour éviter un état "0" avant le chargement des enfants
      } else if (authState.isConnecte === false) {
        console.log('[👨‍👧 DASHBOARD PARENT] Utilisateur non connecté depuis authState');
        // Ne pas rediriger immédiatement, essayer de charger d'abord
        this.loadUtilisateurConnecte();
      }
    });
    // Charger les actualités du club sélectionné
    this.clubIdSubscription = this.clubSelectionService.selectedClubId$.subscribe(clubId => {
      if (clubId) {
        this.actualiteService.getActualitesByClub(clubId).subscribe({
          next: (data) => {
            this.actualitesClub = Array.isArray(data) ? data : [];
          },
          error: () => {
            this.actualitesClub = [];
          }
        });
      } else {
        this.actualitesClub = [];
      }
    });
    // Aussi essayer de charger directement
    setTimeout(() => {
      if (!this.utilisateurConnecte) {
        this.loadUtilisateurConnecte();
      }
    }, 500);
  }


  /** Récupère le nombre réel d'événements à venir pour le parent connecté */
  loadEvenementsAVenir(): void {
    // Ici, on suppose que le clubId est connu (sinon, adapter selon la logique métier)
    const clubId = (this.utilisateurConnecte as any)?.clubId ?? (this.authService.getUtilisateurConnecte() as any)?.clubId;
    if (!clubId) {
      console.log('[EVT] Aucun clubId trouvé, aucun événement à venir.');
      this.stats.evenementsAVenir = 0;
      this.cdr.detectChanges();
      return;
    }
    this.evenementService.getEvenementsByClub(Number(clubId)).subscribe(evenements => {
      const now = new Date();
      const aVenir = (evenements || []).filter(ev => new Date(ev.dateDebut) > now);
      console.log(`[EVT] Événements à venir trouvés : ${aVenir.length}`, aVenir);
      this.stats.evenementsAVenir = aVenir.length;
      this.cdr.detectChanges();
    });
  }

      // Préparation pour la récupération réelle des documents manquants
      // loadDocumentsManquants(): void {
      //   // À compléter selon l'API backend
      //   // Exemple : this.documentService.getDocumentsManquants().subscribe(count => { this.stats.documentsManquants = count; });
      // }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
    this.clubIdSubscription?.unsubscribe();
  }

  /* -------------------------------------------
     🔐 Récupération du parent connecté
  ------------------------------------------- */
  private loadUtilisateurConnecte(): void {
    if (!this.authService.isConnecte()) {
      console.warn('[DASHBOARD PARENT] Utilisateur non connecte. Redirection vers la connexion.');
      this.router.navigate(['/connexion']);
      return;
    }

    const serviceUser = this.authService.getUtilisateurConnecte();
    if (serviceUser) {
      this.utilisateurConnecte = serviceUser as Utilisateur;
      return;
    }

    this.http.get<Utilisateur>(`${environment.apiUrl}/utilisateurs/me`).subscribe({
      next: utilisateur => {
        this.utilisateurConnecte = utilisateur;
      },
      error: err => {
        console.error('[👨‍👧 DASHBOARD PARENT] Erreur lors de la récupération via API :', err);
      }
    });
  }
}
