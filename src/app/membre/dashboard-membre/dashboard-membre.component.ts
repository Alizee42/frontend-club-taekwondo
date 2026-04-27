import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient} from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { DashboardCardComponent } from '../../dashboard/shared/dashboard-card/dashboard-card.component';
import { AuthService } from '../../services/auth.service';
import { RequiredDocsService, RequiredDocConfig } from '../../shared/documents/required-docs.service';
import { UiTitleComponent } from '../../shared/ui/title/ui-title.component';
import { DOC_CATALOG } from '../../shared/documents/doc-utils';
import { DashboardNavCardComponent } from '../../dashboard/shared/dashboard-nav-card/dashboard-nav-card.component';



interface Utilisateur {
  id: number | string;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;        // <-- ajouté
  dateNaissance?: string;    // <-- ajouté (ISO yyyy-MM-dd)
  role?: string;
  avatar?: string;           // <-- ajouté pour l'avatar
}

@Component({
  standalone: true,
  selector: 'app-dashboard-membre',
  templateUrl: './dashboard-membre.component.html',
  styleUrls: ['./dashboard-membre.component.css'],
  imports: [CommonModule, FormsModule, DashboardNavCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardMembreComponent implements OnInit {
  private readonly API_BASE = environment.apiUrl;
  alertsReady = false;
  private docsLoaded = false;
  private requiredLoaded = false;

  navigateToProfil(): void {
    this.router.navigate(['/profil']);
  }

  navigateToSupport(): void {
    this.router.navigate(['/contact']);
  }

  utilisateurConnecte: Utilisateur | null = null;

  // Documents obligatoires (même référentiel que DocumentsComponent)
  requiredDocuments: Array<{ type: string; label: string; uploaded: boolean; etat: string }> = [
    { type: 'CERTIFICAT_MEDICAL', label: 'Certificat médical (< 1 an)', uploaded: false, etat: 'non_envoyé' },
    { type: 'PHOTO_IDENTITE',     label: "Photo d'identité",            uploaded: false, etat: 'non_envoyé' },
    { type: 'DOCUMENT_IDENTITE',  label: "Document d'identité",         uploaded: false, etat: 'non_envoyé' }
  ];
  documents: any[] = [];

  stats = {
    paiementsEnRetard: 0,
    documentsManquants: 0,
    commandesEnCours: 0,
    evenementsAVenir: 2
  };

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private requiredSvc: RequiredDocsService
  ) {}


  ngOnInit(): void {
    this.loadUtilisateur();
  }
  loadDocuments(): void {
    this.alertsReady = false;
    this.docsLoaded = false;
    const utilisateurId = this.utilisateurConnecte?.id || this.authService.getUserIdFromToken();
    if (!utilisateurId) {
      console.warn('[MEMBRE][DOCS] Aucun utilisateurId trouvé, abandon du chargement des documents.');
      return;
    }
    console.log('[MEMBRE][DOCS] Chargement des documents pour utilisateurId =', utilisateurId);
    this.http.get<any>(`${this.API_BASE}/documents/utilisateur/${utilisateurId}`).subscribe({
      next: (documents) => {
        const arr: any[] = Array.isArray(documents) ? documents
          : Array.isArray(documents?.items) ? documents.items
          : Array.isArray(documents?.data) ? documents.data
          : Array.isArray(documents?.results) ? documents.results
          : Array.isArray(documents?.documents) ? documents.documents
          : [];
        console.log('[MEMBRE][DOCS] Réponse documents brute -> taille:', arr.length, 'exemple:', arr[0]);
        this.documents = arr.map(d => ({
          ...d,
          typeDocument: this.unifyType((d as any)?.typeDocument ?? (d as any)?.type ?? (d as any)?.code ?? (d as any)?.label),
          status: this.normalizeStatus((d as any)?.status ?? (d as any)?.statut ?? 'en_attente')
        }));
        console.log('[MEMBRE][DOCS] Documents normalisés (type/status) ->', this.documents);
        this.updateRequiredDocumentsStatus();
        this.docsLoaded = true;
        this.recomputeAndFinalizeAlerts();
      },
      error: (err) => {
        console.error('[MEMBRE][DOCS] Erreur chargement documents :', err);
        this.documents = [];
        this.updateRequiredDocumentsStatus();
        this.docsLoaded = true;
        this.recomputeAndFinalizeAlerts();
      }
    });
  }

  updateRequiredDocumentsStatus(): void {
    this.requiredDocuments = this.requiredDocuments.map(req => {
      const code = req.type;
      const docsOfType = this.documents.filter(d => this.unifyType(d.typeDocument) === code);
      if (docsOfType.length === 0) {
        return { ...req, uploaded: false, etat: 'non_envoyé' };
      }
      if (docsOfType.some(d => this.normalizeStatus(d.status) === 'validé')) {
        return { ...req, uploaded: true, etat: 'validé' };
      }
      if (docsOfType.some(d => this.normalizeStatus(d.status) === 'refusé')) {
        return { ...req, uploaded: false, etat: 'refusé' };
      }
      return { ...req, uploaded: true, etat: 'en_attente' };
    });
    // Met à jour le nombre réel de documents manquants
    this.stats.documentsManquants = this.requiredDocuments.filter(doc => doc.etat === 'non_envoyé' || doc.etat === 'refusé').length;
  }

  unifyType(input: any): string {
    const raw = String(input || '').trim();
    if (!raw) return raw;
    if (DOC_CATALOG.some(t => t.code === raw)) return raw;

    const norm = raw
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[\s''_-]+/g, '');

    for (const t of DOC_CATALOG) {
      const candidates = [t.code, t.label, ...(t.aliases || [])];
      if (candidates.some(c =>
        String(c)
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .toLowerCase().replace(/[\s''_-]+/g, '') === norm
      )) {
        return t.code;
      }
    }
    return raw;
  }

  private normalizeStatus(s: any): string {
    const v = String(s || '').toLowerCase();
    if (["valide", "validé", "validee", "validée", "approved"].includes(v)) return "validé";
    if (["pending", "en_attente", "en attente", "attente"].includes(v)) return "en_attente";
    if (["refuse", "refusé", "refusee", "refusée", "rejected"].includes(v)) return "refusé";
    return "en_attente";
  }

  private loadUtilisateur(): void {
    // 🔹 On vérifie juste que l'utilisateur est connecté via le service
    // L'intercepteur gère automatiquement les erreurs 401
    if (!this.authService.isConnecte()) {
      console.warn('Utilisateur non connecté. Redirection vers la page de connexion.');
      this.router.navigate(['/connexion']);
      return;
    }

    // 🔹 Récupérer l'utilisateur depuis le service (plus fiable)
    const user = this.authService.getUtilisateurConnecte();
    if (user) {
      this.utilisateurConnecte = this.normalizeUser(user);
      console.log('Utilisateur récupéré depuis le service :', user);
      // stocke l'id utilisateur pour réutilisation éventuelle
      // Charger la config des documents requis par club si disponible, puis les documents
      const clubId = (user as any)?.clubId ?? null;
      this.loadRequiredConfig(clubId);
      this.loadDocuments();
    } else {
      // 🔹 Si pas d'utilisateur dans le service, faire une requête
      this.loadUserFromAPI();
    }
  }

  private loadUserFromAPI(): void {
    if (!this.authService.isConnecte()) return;

    this.http.get<Utilisateur>(`${this.API_BASE}/utilisateurs/me`).subscribe({
      next: (u) => {
        console.log('Utilisateur récupéré avec succès :', u);
        this.utilisateurConnecte = this.normalizeUser(u);
        // Charger la config des documents requis par club si disponible, puis les documents
        const clubId = (u as any)?.clubId ?? null;
        this.loadRequiredConfig(clubId);
        this.loadDocuments();
      },
      error: (err) => {
        console.error('Erreur lors de la récupération de l\'utilisateur :', err);
        // 🚫 SUPPRIMÉ: Pas de redirection manuelle, l'intercepteur s'en charge
      }
    });
  }

  private loadRequiredConfig(clubId: number | null) {
    console.log('[MEMBRE][DOCS] Chargement config requis par clubId =', clubId);
    if (clubId && clubId > 0) {
      this.requiredSvc.getByClub(clubId).subscribe({
        next: (list: RequiredDocConfig[] | any) => {
          const items = Array.isArray(list) ? list.filter(d => d.active !== false) : [];
          if (items.length > 0) {
            this.requiredDocuments = items
              .sort((a,b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
              .map((it: any) => ({ type: it.code, label: it.label, uploaded: false, etat: 'non_envoyé' }));
            console.log('[MEMBRE][DOCS] Config requis (club) chargée ->', this.requiredDocuments);
            this.updateRequiredDocumentsStatus();
            this.requiredLoaded = true;
            this.recomputeAndFinalizeAlerts();
            this.cdr.detectChanges();
            return;
          }
          // fallback sur DOC_CATALOG
          this.requiredDocuments = DOC_CATALOG.map(t => ({ type: t.code, label: t.label, uploaded: false, etat: 'non_envoyé' }));
          console.log('[MEMBRE][DOCS] Aucune config club active, fallback DOC_CATALOG ->', this.requiredDocuments);
          this.updateRequiredDocumentsStatus();
          this.requiredLoaded = true;
          this.recomputeAndFinalizeAlerts();
          this.cdr.detectChanges();
        },
        error: () => {
          console.warn('[MEMBRE][DOCS] Erreur chargement config club, fallback DOC_CATALOG');
          this.requiredDocuments = DOC_CATALOG.map(t => ({ type: t.code, label: t.label, uploaded: false, etat: 'non_envoyé' }));
          this.updateRequiredDocumentsStatus();
          this.requiredLoaded = true;
          this.recomputeAndFinalizeAlerts();
          this.cdr.detectChanges();
        }
      });
    } else {
      this.requiredDocuments = DOC_CATALOG.map(t => ({ type: t.code, label: t.label, uploaded: false, etat: 'non_envoyé' }));
      console.log('[MEMBRE][DOCS] Pas de clubId, fallback DOC_CATALOG ->', this.requiredDocuments);
      this.updateRequiredDocumentsStatus();
      this.requiredLoaded = true;
      this.recomputeAndFinalizeAlerts();
      this.cdr.detectChanges();
    }
  }

  private recomputeAndFinalizeAlerts(): void {
    // Règle Membre: seul un document "validé" couvre un type requis.
    const typesValides = new Set(
      (this.documents || [])
        .filter(d => this.normalizeStatus((d as any)?.status ?? (d as any)?.statut) === 'validé')
        .map(d => this.unifyType((d as any)?.typeDocument ?? (d as any)?.type ?? (d as any)?.code ?? (d as any)?.label))
    );
    const catalog = (this.requiredDocuments && this.requiredDocuments.length > 0)
      ? this.requiredDocuments.map(d => ({ code: d.type }))
      : DOC_CATALOG.map(t => ({ code: t.code }));
    const manquants = catalog.filter(t => !typesValides.has(t.code));
    this.stats.documentsManquants = manquants.length;
    console.log('[MEMBRE][ALERTES] typesValides =', Array.from(typesValides));
    console.log('[MEMBRE][ALERTES] catalog =', catalog.map(c => c.code));
    console.log('[MEMBRE][ALERTES] manquants =', manquants.map(m => m.code), ' => N =', this.stats.documentsManquants);

    if (this.docsLoaded && this.requiredLoaded) {
      this.alertsReady = true;
      console.log('[MEMBRE][ALERTES] Finalisation -> alertsReady =', this.alertsReady, '| docsLoaded =', this.docsLoaded, '| requiredLoaded =', this.requiredLoaded);
      this.cdr.detectChanges();
    }
  }

    private normalizeUser(u: any): Utilisateur {
    return {
      id: u?.id ?? u?._id ?? u?.uuid,
      nom: (u?.nom ?? u?.lastName ?? '').trim(),
      prenom: (u?.prenom ?? u?.firstName ?? '').trim(),
      email: u?.email ?? '',
      telephone: u?.telephone ?? '',
      dateNaissance: u?.dateNaissance ?? undefined,
      role: u?.role ?? '',
    };
  }

  // Handlers communs
  navigateToDocuments() {
    this.router.navigate(['/membre/documents']);
  }

  navigateToPaiements() {
    this.router.navigate(['/membre/paiements']);
  }

  navigateToCommandes() {
    this.router.navigate(['/membre/commandes']);
  }

  navigateToEvenements() {
    this.router.navigate(['/membre/evenements']);
  }
}
