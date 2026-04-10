  import { Component, OnInit } from '@angular/core';
  import { HttpClient } from '@angular/common/http';
  import { CommonModule, NgClass, NgFor } from '@angular/common';
  import { FormsModule } from '@angular/forms';
  import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
  import { environment } from '../../../environments/environment';
  import { UiTitleComponent } from '../../shared/ui/title/ui-title.component';
  import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';
  import { UiTableComponent, UiTableColumn } from '../../shared/components/ui-table/ui-table.component';
  import { DOC_CATALOG, labelFor as docLabelFor, unifyType, normalizeStatus } from '../../shared/documents/doc-utils';
  
  /* ========= Types ========= */
  type StatutDoc = 'validé' | 'refusé' | 'en_attente' | string;
  
  interface ChildItem {
    id: number | string;
    prenom?: string;
    nom?: string;
    numeroLicence?: string;
  }
  
  interface DocumentItem {
    id: number | string;
    typeDocument: string;
    nomDocument: string;
    status: StatutDoc;
    dateDepot?: string | Date;
    cheminFichier?: string;
  
    // Associations utilisateur / enfant
    utilisateur?: {
      id: number | string;
      nom: string;
      prenom: string;
      email: string;
      telephone?: string;
      role?: string;
      enfants?: ChildItem[];
    };
    utilisateurId?: number | string;
  
    // Pour les enfants (membres rattachés)
    membreId?: number | string;
    enfantId?: number | string;
    enfant?: ChildItem | null;
  
    commentaire?: string;
  }
  
  interface UtilisateurRow {
    id: number | string;
    nom: string;
    prenom: string;
    email: string;
    telephone?: string;
    role?: string;
  
    // Gestion UI
    isOpen: boolean;
    selectedChildFilter?: number | string | null;
  
    // Données
    documents: DocumentItem[];
    enfants?: ChildItem[];
  }
  
// labelFor devient une méthode d'instance
  
  /* ========= Composant ========= */
  @Component({
    selector: 'app-gestion-documents',
    templateUrl: './gestion-documents.component.html',
    styleUrls: ['./gestion-documents.component.css'],
    standalone: true,
  imports: [CommonModule, NgClass, NgFor, FormsModule, UiTitleComponent, UiButtonComponent, UiTableComponent],
  })
  export class GestionDocumentsComponent implements OnInit {
  // labelFor accessible dans le template (via util partagé)
  labelFor(code: string) { return docLabelFor(code); }

  // Méthode pour l'accordéon
  toggleAccordion(utilisateur: UtilisateurRow) {
    utilisateur.isOpen = !utilisateur.isOpen;
  }

  // Méthode pour valider tous les documents d'un utilisateur
  validerTous(utilisateur: UtilisateurRow) {
    utilisateur.documents
      .filter(d => this.normalizeStatus(d.status) === 'en_attente')
      .forEach(d => this.validerDocument(d));
  }

  // Méthode pour valider un document (appel backend)
  validerDocument(document: DocumentItem) {
    this.http.put(`${this.API_BASE}/documents/${document.id}/valider`, null, { observe: 'response' })
      .subscribe({
        next: () => { document.status = 'validé'; },
        error: (err) => { console.error('Erreur validation document', err); }
      });
  }
    private readonly API_BASE = environment.apiUrl;
  
  utilisateurs: UtilisateurRow[] = [];
  utilisateursFiltres: UtilisateurRow[] = [];
  // Vue: groupée ou tableau plat
  groupByUser: boolean = true;
    // Vue tableau: colonnes, actions et données à plat
  tableColumns: UiTableColumn[] = [];
  groupedTableColumns: UiTableColumn[] = [];
    tableActions: Array<{ label: string; icon?: string; action: string; color?: string; show?: (row: any) => boolean; title?: string }> = [
      { label: 'Valider', icon: 'ri-check-line', action: 'approve', color: '#16a34a', show: (row: any) => (row?.statut ?? '') !== 'validé', title: 'Valider' },
      { label: 'Refuser', icon: 'ri-close-line', action: 'reject', color: '#dc2626', show: (row: any) => (row?.statut ?? '') !== 'refusé', title: 'Refuser' },
      { label: 'Télécharger', icon: 'ri-download-line', action: 'download', color: 'var(--blue-main)', show: (row: any) => (row?.statut ?? '') === 'validé', title: 'Télécharger' }
    ];
  flatRows: Array<any> = [];
  
    searchTerm: string = '';
    filtreStatut: '' | 'validé' | 'refusé' | 'en_attente' = '';
  
    documentEnApercu: DocumentItem | null = null;
  
    constructor(
      private http: HttpClient,
      private sanitizer: DomSanitizer
    ) {}
  
    ngOnInit() {
      this.loadDocuments();
    }
  
    /* ===== Helpers rôle & enfants (par utilisateur) ===== */
    private normRole(val: any): string {
      return (val ?? '').toString().trim().toUpperCase();
    }
    isParentRow(u: UtilisateurRow): boolean {
      const r = this.normRole(u.role);
      if (r === 'PARENT') return true;
      return u.documents?.some(d => this.getDocChildId(d) != null) ?? false;
    }
    isMembreSeulRow(u: UtilisateurRow): boolean {
      const r = this.normRole(u.role);
      return r === 'MEMBRE' || r === 'MEMBRE_SEUL' || (!this.isParentRow(u));
    }
  
    hasKids(u: UtilisateurRow): boolean {
      return Array.isArray(u.enfants) && u.enfants.length > 0;
    }
    multipleKids(u: UtilisateurRow): boolean {
      return Array.isArray(u.enfants) && u.enfants.length > 1;
    }
  
    private getDocChildId(doc: DocumentItem): number | string | null {
      return (doc?.enfantId ?? doc?.membreId ?? doc?.enfant?.id ?? null) as any;
    }
  
    /** Essaie de déduire un enfant (id, prénom, nom, licence) depuis un document brut */
    private inferChildFromDoc(d: any): ChildItem | null {
      const id =
        d?.enfantId ?? d?.membreId ??
        d?.kidId ?? d?.enfant?.id ?? d?.membre?.id ?? null;
  
      const prenom =
        d?.enfant?.prenom ?? d?.membre?.prenom ??
        d?.enfantPrenom ?? d?.prenomMembre ?? d?.kidPrenom ?? null;
  
      const nom =
        d?.enfant?.nom ?? d?.membre?.nom ??
        d?.enfantNom ?? d?.nomMembre ?? d?.kidNom ?? null;
  
      const numeroLicence =
        d?.enfant?.numeroLicence ?? d?.membre?.numeroLicence ??
        d?.enfantLicence ?? d?.numeroLicence ?? null;
  
      if (id == null) return null;
      return {
        id,
        prenom: prenom || undefined,
        nom: nom || undefined,
        numeroLicence: numeroLicence || undefined,
      };
    }
  
    /** Depuis un doc + utilisateur parent, retrouve le ChildItem le plus riche possible */
    private resolveChildForDoc(doc: DocumentItem, u: UtilisateurRow): ChildItem | null {
      if (doc?.enfant && doc.enfant.id != null) return doc.enfant;
      const id = this.getDocChildId(doc);
      if (id != null && this.hasKids(u)) {
        const found = u.enfants!.find(k => String(k.id) === String(id));
        if (found) return found;
      }
      if (id != null) return { id };
      return null;
    }
  
    /** Nom complet à afficher (toujours "Prénom Nom") */
    childName(k: ChildItem, u?: UtilisateurRow): string {
      const direct = [k?.prenom, k?.nom].filter(Boolean).join(' ').trim();
      if (direct) return direct;
  
      const kidId = k?.id;
      if (u) {
        const doc = (u.documents || []).find(d => String(this.getDocChildId(d)) === String(kidId));
        if (doc) {
          const inferred = doc.enfant || this.resolveChildForDoc(doc, u);
          const alt = [inferred?.prenom, inferred?.nom].filter(Boolean).join(' ').trim();
          if (alt) return alt;
        }
      }
      return 'Nom inconnu';
    }
  
    enfantLabelFor(doc: DocumentItem, u: UtilisateurRow): string {
      const child = this.resolveChildForDoc(doc, u) || doc.enfant || null;
      if (!child) return 'Nom inconnu';
      return this.childName(child, u);
    }
  
    filteredDocs(u: UtilisateurRow): DocumentItem[] {
      const docs = u?.documents ?? [];
      const filterId = u?.selectedChildFilter ?? null;
      if (!filterId) return docs;
      return docs.filter(d => String(this.getDocChildId(d)) === String(filterId));
    }
  
    /* ===== Normalisation statut ===== */
    normalizeStatus(s: any): StatutDoc { return normalizeStatus(s); }
  
    /* ===== Chargement & groupage ===== */
    loadDocuments() {
      this.http.get<any[]>(`${this.API_BASE}/documents`).subscribe({
        next: (docsRaw) => {
          const utilisateursMap = new Map<string | number, UtilisateurRow>();
          const enfantsByUser = new Map<string | number, Map<string, ChildItem>>();
  
          (docsRaw || []).forEach((d: any) => {
            const child = this.inferChildFromDoc(d);
            const enfantId = child?.id ?? null;
  
            const doc: DocumentItem = {
              id: d?.id ?? d?._id ?? d?.uuid,
              typeDocument: unifyType(d?.typeDocument ?? d?.type ?? ''),
              nomDocument: d?.nomDocument ?? d?.filename ?? d?.nom ?? '',
              status: this.normalizeStatus(d?.status ?? d?.statut ?? 'en_attente'),
              dateDepot: d?.dateDepot ?? d?.createdAt,
              cheminFichier: d?.cheminFichier ?? d?.url,
              utilisateur: d?.utilisateur,
              utilisateurId: d?.utilisateurId ?? d?.utilisateur?.id,
              membreId: d?.membreId ?? undefined,
              enfantId: enfantId ?? undefined,
              enfant: child ?? null,
              commentaire: d?.commentaire
            };
  
            const u = d?.utilisateur;
            if (u?.id != null) {
              const uid = u.id as number | string;
  
              if (!utilisateursMap.has(uid)) {
                utilisateursMap.set(uid, {
                  id: uid,
                  nom: (u.nom || '').trim(),
                  prenom: (u.prenom || '').trim(),
                  email: u.email || '—',
                  telephone: u.telephone || '',
                  role: u.role,
                  isOpen: false,
                  selectedChildFilter: null,
                  documents: [],
                  enfants: Array.isArray(u.enfants) ? [...u.enfants] : []
                });
              }
  
              utilisateursMap.get(uid)!.documents.push(doc);
  
              if (!enfantsByUser.has(uid)) {
                enfantsByUser.set(uid, new Map<string, ChildItem>());
              }
              const childIdx = enfantsByUser.get(uid)!;
  
              if (child && child.id != null) {
                childIdx.set(String(child.id), child);
              }
            } else {
              console.warn('Document sans utilisateur associé :', d);
            }
          });
  
          this.utilisateurs = Array.from(utilisateursMap.values())
            .map(u => {
              const idx = enfantsByUser.get(u.id);
              if (idx) {
                const inf = Array.from(idx.values());
                const byId = new Map<string, ChildItem>();
                (u.enfants || []).forEach(k => byId.set(String(k.id), k));
                inf.forEach(k => byId.set(String(k.id), { ...(byId.get(String(k.id)) || {}), ...k }));
                u.enfants = Array.from(byId.values());
              }
              return u;
            })
            .sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr', { sensitivity: 'base' }));
  
          this.utilisateursFiltres = [...this.utilisateurs];
          this.computeFlatRows();
        },
        error: (err) => {
          console.error('Erreur lors du chargement des documents :', err);
          this.utilisateurs = [];
          this.utilisateursFiltres = [];
        },
      });
    }
  
    refuserTous(utilisateur: UtilisateurRow) {
      utilisateur.documents
        .filter(d => this.normalizeStatus(d.status) === 'en_attente')
        .forEach(d => this.refuserDocument(d));
    }
  
    estFinalise(doc: DocumentItem): boolean {
      const st = this.normalizeStatus(doc.status);
      return st === 'validé' || st === 'refusé';
    }
  
    /* ===== Statuts UI ===== */
    getStatusText(status: string): string {
      switch (this.normalizeStatus(status)) {
        case 'validé': return 'Validé';
        case 'refusé': return 'Refusé';
        default: return 'En attente';
      }
    }
  
    getStatusClass(status: string): string {
      switch (this.normalizeStatus(status)) {
        case 'validé': return 'status-validé';
        case 'refusé': return 'status-refusé';
        default: return 'status-en-attente';
      }
    }
  
    getStatusIcon(status: string): string {
      switch (this.normalizeStatus(status)) {
        case 'validé': return 'ri-check-line';
        case 'refusé': return 'ri-close-line';
        default: return 'ri-time-line';
      }
    }
  
    getGlobalStatus(documents: DocumentItem[]): 'validé' | 'refusé' | 'en_attente' {
      const anyRefused = documents.some(d => this.normalizeStatus(d.status) === 'refusé');
      if (anyRefused) return 'refusé';
      const allValid = documents.length > 0 && documents.every(d => this.normalizeStatus(d.status) === 'validé');
      if (allValid) return 'validé';
      return 'en_attente';
    }
  
    getGlobalStatusText(documents: DocumentItem[]): string {
      const status = this.getGlobalStatus(documents);
      if (status === 'validé') return 'Tout validé';
      if (status === 'refusé') return 'Des documents refusés';
      return 'En attente';
    }
  
    getGlobalStatusClass(documents: DocumentItem[]): string {
      return 'badge ' + this.getGlobalStatus(documents);
    }
  
    /* ===== Filtre global (recherche + statut) ===== */
    filtrerUtilisateurs() {
      const term = this.searchTerm.trim().toLowerCase();
      const stat = this.filtreStatut;
  
      this.utilisateursFiltres = this.utilisateurs.filter(u => {
        const txt = `${u.nom} ${u.prenom} ${u.email} ${u.telephone || ''}`.toLowerCase();
        const matchText = !term || txt.includes(term);
        const matchStat = !stat || u.documents.some(d => this.normalizeStatus(d.status) === stat);
        return matchText && matchStat;
      });
      this.computeFlatRows();
    }
  
    /* ===== Aperçu ===== */
    ouvrirApercu(doc: DocumentItem) { this.documentEnApercu = doc; }
    fermerApercu() { this.documentEnApercu = null; }
  
    /* ================= Preview / URL robustes ================= */
    /** Encode seulement le dernier segment du chemin (le nom de fichier), en tentant de décoder d'abord. */
    private encodeLastSegment(p: string): string {
      const parts = p.split('/');
      const last = parts.pop() || '';
      let decoded = last;
      try { decoded = decodeURIComponent(last); } catch { /* ignore */ }
      parts.push(encodeURIComponent(decoded));
      return parts.join('/');
    }
  
    /**
     * Construit une URL exploitable par le navigateur depuis cheminFichier
     */
    private buildUrl(path?: string): string {
      if (!path) return '';
      let p = String(path).trim();
      // Absolu => on laisse
      if (/^https?:\/\//i.test(p)) return p;
      // Nettoie les ./ ou // au début
      p = p.replace(/^\.?\/+/, '');
      // On force le préfixe backend Spring
      if (!p.startsWith('documents/')) {
        p = `documents/${p}`;
      }
      // Correction : inclure explicitement /documents/ dans l'URL API
      p = `/api/uploads/documents/${p.replace(/^documents\//, '')}`;
      return this.encodeLastSegment(p);
    }
  
    /** Refus d'un document (appel backend) */
    refuserDocument(doc: DocumentItem): void {
      this.http.put(`${this.API_BASE}/documents/${doc.id}/refuser`, null, { observe: 'response' })
        .subscribe({
          next: () => { doc.status = 'refusé'; },
          error: (err) => { console.error('Erreur refus document', err); }
        });
    }
  
    /** URL pour les balises sécurisées (iframe/object/img) */
    getSafeUrl(path: string | undefined): SafeResourceUrl {
      return this.sanitizer.bypassSecurityTrustResourceUrl(this.buildUrl(path));
    }
  
    /** URL brute pour un <a target="_blank"> */
    rawUrl(path?: string): string {
      return this.buildUrl(path);
    }
  
    /** Fallback image si 404 ou CORS */
    onImgError(ev: Event) {
      const el = ev.target as HTMLImageElement;
      el.src = '/assets/file-placeholder.png';
    }
  
    estImage(nom: string | undefined): boolean {
      return !!nom && /\.(png|jpe?g|gif|bmp|webp)$/i.test(nom);
    }
  
    // + nouvelle méthode
    estImagePath(path?: string): boolean {
      if (!path) return false;
      const p = String(path).split('?')[0]; // enlève les query params
      return /\.(png|jpe?g|gif|bmp|webp)$/i.test(p);
    }

    /* ===== Vue tableau: préparation colonnes + données ===== */
    private initTableColumnsOnce() {
      if (this.tableColumns.length) return;
      this.tableColumns = [
        { key: 'utilisateurNom', label: 'Utilisateur' },
        { key: 'utilisateurEmail', label: 'Email' },
        { key: 'enfantNom', label: 'Enfant' },
        { key: 'typeLabel', label: 'Type' },
        {
          key: 'voir',
          label: 'Voir',
          type: 'button',
          buttonLabel: '',
          buttonIcon: 'ri-eye-line',
          buttonVariant: 'primary',
          buttonCustomClass: 'btn-icon-only',
          buttonDisabled: (row: any) => !this.rawUrl(row.cheminFichier),
          buttonOnClick: (row: any) => this.ouvrirApercu(row.__doc)
        },
        {
          key: 'dateDepot',
          label: 'Date',
          type: 'date',
          display: (row: any) => row?.dateDepot ? new Date(row.dateDepot).toLocaleDateString('fr-FR') : ''
        },
        {
          key: 'statut',
          label: 'Statut',
          type: 'text',
          display: (row: any) => {
            const s = this.normalizeStatus(row.statut);
            return s === 'en_attente' ? 'en attente' : s;
          },
          textClass: (row: any) => {
            const s = this.normalizeStatus(row.statut);
            if (s === 'validé') return 'badge-pill badge-success';
            if (s === 'refusé') return 'badge-pill badge-danger';
            return 'badge-pill badge-warn';
          }
        }
      ];
      // Colonnes pour la vue groupée (on masque Utilisateur / Email redondants)
      this.groupedTableColumns = this.tableColumns.filter(c => c.key !== 'utilisateurNom' && c.key !== 'utilisateurEmail');
    }

    computeFlatRows() {
      this.initTableColumnsOnce();
      const rows: any[] = [];
      for (const u of this.utilisateursFiltres) {
        const docs = this.filteredDocs(u);
        for (const d of docs) {
          const enfantNom = this.isParentRow(u) ? this.enfantLabelFor(d, u) : '—';
          rows.push({
            __doc: d,
            utilisateurNom: `${u.prenom} ${u.nom}`.trim(),
            utilisateurEmail: u.email,
            enfantNom,
            typeLabel: this.labelFor(d.typeDocument),
            statut: this.normalizeStatus(d.status),
            dateDepot: d.dateDepot,
            cheminFichier: d.cheminFichier
          });
        }
      }
      this.flatRows = rows;
    }

    /* ===== Vue groupée: données par utilisateur pour ui-table ===== */
    groupRows(u: UtilisateurRow): Array<any> {
      const docs = this.filteredDocs(u);
      return docs.map(d => ({
        __doc: d,
        utilisateurNom: `${u.prenom} ${u.nom}`.trim(),
        utilisateurEmail: u.email,
        enfantNom: this.isParentRow(u) ? this.enfantLabelFor(d, u) : '—',
        typeLabel: this.labelFor(d.typeDocument),
        statut: this.normalizeStatus(d.status),
        dateDepot: d.dateDepot,
        cheminFichier: d.cheminFichier
      }));
    }

    /* ===== Styles d'entête groupée et compteurs ===== */
    getGroupClass(docs: DocumentItem[]): string {
      if (!docs || !docs.length) return '';
      const hasWaiting = docs.some(d => this.normalizeStatus(d.status) === 'en_attente');
      const hasRefused = docs.some(d => this.normalizeStatus(d.status) === 'refusé');
      if (hasWaiting) return 'status-warn';
      if (hasRefused) return 'status-danger';
      return 'status-success';
    }

    countStatus(docs: DocumentItem[], s: StatutDoc): number {
      return (docs || []).filter(d => this.normalizeStatus(d.status) === s).length;
    }

    /* ===== Actions vue tableau ===== */
    onActionTable(event: { action: string; row: any }) {
      const { action, row } = event;
      const doc: DocumentItem = row?.__doc;
      if (!doc) return;
      if (action === 'approve') { this.validerDocument(doc); return; }
      if (action === 'reject') { this.refuserDocument(doc); return; }
      if (action === 'download') {
        if (this.normalizeStatus(doc.status) !== 'validé') return;
        const url = this.rawUrl(doc.cheminFichier);
        if (url) window.open(url, '_blank');
      }
    }
  }