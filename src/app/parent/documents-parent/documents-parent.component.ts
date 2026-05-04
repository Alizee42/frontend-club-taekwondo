import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { DOC_CATALOG, labelFor as docLabelFor, unifyType, normalizeStatus } from '../../shared/documents/doc-utils';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { KpiCardComponent } from '../../shared/ui/kpi-card/kpi-card.component';
import { KpiGridComponent } from '../../shared/ui/kpi-grid/kpi-grid.component';
import { RequiredDocsService, RequiredDocConfig } from '../../shared/documents/required-docs.service';
import { ToastService } from '../../shared/toast/toast.service';
import { UiTableComponent, UiTableColumn } from '../../shared/components/ui-table/ui-table.component';
import { UiModalComponent } from '../../shared/ui/modal/ui-modal.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';


type StatutDoc = 'validé' | 'refusé' | 'en_attente' | string;

interface Utilisateur {
  id: number | string;
  nom: string;
  prenom: string;
  email?: string;
  role?: string;
  clubId?: number;
}

interface Enfant {
  id: number | string;
  nom: string;
  prenom: string;
  numeroLicence?: string;
}

interface DocumentItem {
  id: number | string;
  typeDocument: string;
  nomDocument: string;
  status: StatutDoc;
  dateDepot: string | Date;
  cheminFichier: string;
  commentaire?: string;
  utilisateurId?: number | string;
  membreId?: number | string;
}

interface RequiredDoc {
  type: string;
  label: string;
  uploaded?: boolean;
}

/* =========================
   Catalogue & helpers (shared)
   ========================= */

@Component({
  standalone: true,
  selector: 'app-documents-parent',
  templateUrl: './documents-parent.component.html',
  styleUrls: ['./documents-parent.component.css'],
  imports: [CommonModule, FormsModule, UiTableComponent, UiModalComponent, EmptyStateComponent, PageHeaderComponent, UiButtonComponent, KpiCardComponent, KpiGridComponent],
})
export class DocumentsParentComponent implements OnInit {
  private readonly API_BASE = environment.apiUrl;

  utilisateurConnecte: Utilisateur | null = null;

  // Enfants liés
  enfants: Enfant[] = [];

  get totalDocs()     { return this.requiredDocuments.length; }
  get docsValides()   { return this.documents.filter(d => normalizeStatus(d.status) === 'validé').length; }
  get docsEnAttente() { return this.documents.filter(d => normalizeStatus(d.status) === 'en_attente').length; }
  selectedKidId: string | number | null = null;

  // Référentiel des documents requis
  requiredDocuments: RequiredDoc[] = DOC_CATALOG.map(t => ({
    type: t.code,
    label: t.label,
    uploaded: false
  }));

  // Formulaire d’upload
  documentType: string | null = null;
  selectedFile: File | null = null;

  // Liste des documents de l’enfant sélectionné
  documents: DocumentItem[] = [];
  // Données ui-table
  tableColumns: UiTableColumn[] = [];
  tableActions: Array<{ label: string; icon?: string; action: string; color?: string; show?: (row: any) => boolean; title?: string }> = [];
  rows: any[] = [];

  // Aperçu
  previewing: DocumentItem | null = null;

  // Expose helper au template (depuis util partagé)
  labelFor = docLabelFor;

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private requiredSvc: RequiredDocsService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    // Initialise colonnes/actions tôt pour que la colonne Actions soit présente immédiatement
    this.tableColumns = [
      { key: 'typeLabel', label: 'Type' },
      {
        key: 'voir',
        label: 'Voir',
        type: 'button',
        buttonLabel: '',
        buttonIcon: 'ri-eye-line',
        buttonVariant: 'primary',
        buttonCustomClass: 'btn-icon-only',
        buttonDisabled: (row: any) => !row.cheminFichier,
        buttonOnClick: (row: any) => this.onPreview(row.__doc)
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
      },
      {
        key: 'dateDepot',
        label: 'Date',
        type: 'date',
        display: (row: any) => row?.dateDepot ? new Date(row.dateDepot).toLocaleDateString('fr-FR') : ''
      }
    ];

    this.tableActions = [
      // Modifier: visible uniquement si non validé (refusé ou en attente)
      { label: 'Modifier', icon: 'ri-pencil-line', action: 'edit', color: '#334155', title: 'Modifier', show: (row: any) => this.normalizeStatus(row.statut) !== 'validé' },
      // Supprimer: on masque aussi si validé pour cohérence UX
      { label: 'Supprimer', icon: 'ri-delete-bin-line', action: 'delete', color: '#dc2626', title: 'Supprimer', show: (row: any) => this.normalizeStatus(row.statut) !== 'validé' }
    ];

    this.loadParentAndKids();
  }

  // =================== LOAD ===================
  private loadParentAndKids(): void {
    this.http.get<any>(`${this.API_BASE}/utilisateurs/me`, {}).subscribe({
      next: (u: any) => {
        this.utilisateurConnecte = {
          id: u?.id ?? u?._id ?? u?.uuid,
          nom: (u?.nom ?? '').trim(),
          prenom: (u?.prenom ?? '').trim(),
          email: u?.email ?? '',
          role: String(u?.role ?? '').toUpperCase(),
          clubId: u?.clubId ?? u?.club?.id ?? undefined,
        };

        // Charger la configuration des documents requis du club si disponible
        const clubId = this.utilisateurConnecte.clubId as number | undefined;
        this.loadRequiredConfig(clubId ?? null);

        if (this.utilisateurConnecte.role !== 'PARENT') {
          this.enfants = [];
          this.selectedKidId = null;
          this.documents = [];
          this.refreshRequiredUploaded();
          return;
        }

        // Enfants du parent connecté
        this.http.get<any>(`${this.API_BASE}/membres/mes-enfants`, {}).subscribe({
          next: (res: any) => {
            const arr: any[] = Array.isArray(res) ? res
              : Array.isArray(res?.items) ? res.items
              : Array.isArray(res?.data) ? res.data
              : Array.isArray(res?.results) ? res.results
              : Array.isArray(res?.membres) ? res.membres
              : [];
            this.enfants = arr.map((m: any) => ({
              id: m?.id ?? m?._id ?? m?.uuid,
              nom: m?.nom ?? '',
              prenom: m?.prenom ?? '',
              numeroLicence: (m?.numeroLicence || '') || undefined,
            }));

            if (!this.selectedKidId && this.enfants.length > 0) {
              this.selectedKidId = this.enfants[0].id;
            }
            if (this.selectedKidId != null) {
              this.loadDocumentsForKid(String(this.selectedKidId));
            } else {
              this.documents = [];
              this.refreshRequiredUploaded();
            }
          },
          error: () => {
            this.enfants = [];
            this.selectedKidId = null;
            this.documents = [];
            this.refreshRequiredUploaded();
          }
        });
      },
      error: () => {
        this.utilisateurConnecte = null;
        this.enfants = [];
        this.selectedKidId = null;
        this.documents = [];
        this.refreshRequiredUploaded();
      }
    });
  }

  private loadRequiredConfig(clubId: number | null) {
    if (clubId && clubId > 0) {
      this.requiredSvc.getByClub(clubId).subscribe({
        next: (list) => {
          const items = Array.isArray(list) ? list.filter(d => d.active !== false) : [];
          if (items.length > 0) {
            this.requiredDocuments = items
              .sort((a,b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
              .map(it => ({ type: it.code, label: it.label, uploaded: false }));
            this.refreshRequiredUploaded();
            return;
          }
          // fallback sur référentiel par défaut
          this.requiredDocuments = DOC_CATALOG.map(t => ({ type: t.code, label: t.label, uploaded: false }));
          this.refreshRequiredUploaded();
        },
        error: () => {
          this.requiredDocuments = DOC_CATALOG.map(t => ({ type: t.code, label: t.label, uploaded: false }));
          this.refreshRequiredUploaded();
        }
      });
    } else {
      this.requiredDocuments = DOC_CATALOG.map(t => ({ type: t.code, label: t.label, uploaded: false }));
      this.refreshRequiredUploaded();
    }
  }

  onSelectKid(): void {
    if (this.selectedKidId == null) {
      this.documents = [];
      this.refreshRequiredUploaded();
      return;
    }
    this.loadDocumentsForKid(String(this.selectedKidId));
  }

  private loadDocumentsForKid(kidId: string): void {
    this.http.get<any>(`${this.API_BASE}/documents/membre/${kidId}`, {}).subscribe({
      next: (res: any) => {
        const arr: any[] = Array.isArray(res) ? res
          : Array.isArray(res?.items) ? res.items
          : Array.isArray(res?.data) ? res.data
          : Array.isArray(res?.results) ? res.results
          : Array.isArray(res?.documents) ? res.documents
          : [];
        this.documents = arr.map(this.mapDoc);
        this.computeRows();
        this.refreshRequiredUploaded();
      },
      error: () => {
        this.documents = [];
        this.rows = [];
        this.refreshRequiredUploaded();
      }
    });
  }

  private mapDoc = (d: any): DocumentItem => {
    return {
      id: d?.id ?? d?._id ?? d?.uuid,
      typeDocument: unifyType(d?.typeDocument ?? d?.type ?? ''),
      nomDocument: d?.nomDocument ?? d?.filename ?? d?.nom ?? '',
      status: this.normalizeStatus(d?.status ?? d?.statut ?? 'en_attente'),
      dateDepot: d?.dateDepot ?? d?.createdAt ?? new Date().toISOString(),
      cheminFichier: d?.cheminFichier ?? d?.url ?? '',
      commentaire: d?.commentaire ?? d?.message ?? undefined,
      utilisateurId: d?.utilisateurId ?? d?.userId ?? undefined,
      membreId: d?.membreId ?? undefined,
    };
  };

  private normalizeStatus(s: any): StatutDoc { return normalizeStatus(s); }

  private refreshRequiredUploaded(): void {
    const set = new Set(this.documents.map(d => unifyType(d.typeDocument)));
    this.requiredDocuments = DOC_CATALOG.map(t => ({
      type: t.code,
      label: t.label,
      uploaded: set.has(t.code)
    }));
  }

  // =================== UPLOAD ===================
  onFileSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.selectedFile = (input?.files && input.files.length > 0) ? input.files[0] : null;
  }

  isValidFile(file: File | null): boolean {
    if (!file) return false;
    const okType = /\.(pdf|png|jpe?g)$/i.test(file.name);
    const okSize = file.size <= 5 * 1024 * 1024; // 5 Mo
    return okType && okSize;
  }

  onUploadDocumentForKid(): void {
    if (!this.selectedKidId || !this.documentType || !this.selectedFile || !this.isValidFile(this.selectedFile)) return;
    if (!this.utilisateurConnecte?.id) return;

    const fd = new FormData();
    fd.append('typeDocument', this.documentType);
    fd.append('file', this.selectedFile); // clé backend: "file"
    fd.append('utilisateurId', String(this.utilisateurConnecte.id));
    fd.append('membreId', String(this.selectedKidId));

    this.http.post<any>(`${this.API_BASE}/documents`, fd, {}).subscribe({
      next: (created: any) => {
        const doc = this.mapDoc(created);
        if (!doc.id) {
          (doc as any).id = `tmp_${Date.now()}`;
          doc.utilisateurId = this.utilisateurConnecte!.id;
          doc.membreId = this.selectedKidId!;
        }
        this.documents = [doc, ...this.documents];
        this.documentType = null;
        this.selectedFile = null;
        this.computeRows();
        this.refreshRequiredUploaded();
        this.toast.success('Document téléversé avec succès.');
      },
      error: () => {
        this.toast.error('Erreur lors du téléversement du document.');
      }
    });
  }

  // =================== EDIT / DELETE ===================
  onEditDocument(doc: DocumentItem): void {
    if (!doc) return;
    if (this.normalizeStatus(doc.status) === 'validé') {
      this.toast.warning('Document validé, non modifiable.');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.png,.jpg,.jpeg';
    input.onchange = () => {
      const file = (input.files && input.files[0]) ? input.files[0] : null;
      if (!file || !this.isValidFile(file)) return;

      const fd = new FormData();
      fd.append('file', file);

      this.http.put<any>(`${this.API_BASE}/documents/${doc.id}/file`, fd, {}).subscribe({
        next: (updated: any) => {
          const mapped = this.mapDoc(updated);
          this.documents = this.documents.map(d => d.id === doc.id ? mapped : d);
          this.computeRows();
          this.refreshRequiredUploaded();
          this.toast.success('Document mis à jour.');
        },
        error: () => {
          this.toast.error('Erreur lors du remplacement du document.');
        }
      });
    };
    input.click();
  }

  onDeleteDocument(doc: DocumentItem): void {
    if (!doc) return;
    if (this.normalizeStatus(doc.status) === 'validé') {
      this.toast.warning('Document validé, non supprimable.');
      return;
    }
    const ok = confirm(`Supprimer le document "${doc.nomDocument}" ?`);
    if (!ok) return;

    this.http.delete(`${this.API_BASE}/documents/${doc.id}`, { observe: 'response' }).subscribe({
      next: () => {
        this.documents = this.documents.filter(d => d.id !== doc.id);
        this.computeRows();
        this.refreshRequiredUploaded();
        this.toast.success('Document supprimé.');
      },
      error: () => {
        this.toast.error('Erreur lors de la suppression du document.');
        this.documents = this.documents.filter(d => d.id !== doc.id);
        this.computeRows();
        this.refreshRequiredUploaded();
      }
    });
  }

  // =================== STATUTS / APERÇU ===================
  getStatusText(status: StatutDoc): string {
    switch (this.normalizeStatus(status)) {
      case 'validé': return 'Validé';
      case 'refusé': return 'Refusé';
      default: return 'En attente';
    }
  }

  getDocumentStatusInfo(type: string): { state: 'validé' | 'refusé' | 'en_attente', text: string, tooltip?: string } {
    const code = unifyType(type);
    const docs = this.documents.filter(d => unifyType(d.typeDocument) === code);

    const hasValid = docs.some(d => this.normalizeStatus(d.status) === 'validé');
    const hasRefused = docs.some(d => this.normalizeStatus(d.status) === 'refusé');
    const hasPending = docs.some(d => this.normalizeStatus(d.status) === 'en_attente');

    if (hasValid) return { state: 'validé', text: 'Validé' };
    if (hasRefused) {
      const refused = docs.find(d => this.normalizeStatus(d.status) === 'refusé');
      return { state: 'refusé', text: 'Refusé', tooltip: refused?.commentaire || 'Document refusé' };
    }
    if (hasPending) return { state: 'en_attente', text: 'En attente' };

    return { state: 'refusé', text: 'Non transmis' };
  }

  onPreview(doc: DocumentItem): void {
    this.previewing = doc;
  }

  closePreview(): void {
    this.previewing = null;
  }

  isImage(name: string): boolean {
    return /\.(png|jpe?g)$/i.test(name || '');
  }
  isImagePath(path?: string): boolean {
    return !!path && /\.(png|jpe?g|gif|bmp|webp)$/i.test(path);
  }

  // =================== URLS (aperçu / téléchargement) ===================
  private encodeLastSegment(p: string): string {
    // conserve ?query et #hash, encode uniquement le dernier segment du chemin
    const q = p.indexOf('?');
    const h = p.indexOf('#');
    const cut = (q === -1) ? h : (h === -1 ? q : Math.min(q, h));
    const base = cut === -1 ? p : p.slice(0, cut);
    const suffix = cut === -1 ? '' : p.slice(cut);

    const parts = base.split('/');
    const last = parts.pop() || '';
    parts.push(encodeURIComponent(last));
    return parts.join('/') + suffix;
  }

  private buildUrl(path?: string): string {
    if (!path) return '';
    let p = String(path).trim();

    // URL absolue => on encode juste le nom de fichier
    if (/^https?:\/\//i.test(p)) return this.encodeLastSegment(p);

    // normalise './', '//'...
    p = p.replace(/^\.?\/+/, '');

    // "documents/xxx" -> "uploads/documents/xxx"
    if (p.startsWith('documents/')) p = `uploads/${p}`;

    // si pas de "uploads/", force "uploads/documents/"
    if (!p.startsWith('uploads/')) p = `uploads/documents/${p}`;

    // préfixes requis
    if (!p.startsWith('/')) p = `/${p}`;
    if (!p.startsWith('/api/')) p = `/api${p}`;

    return this.encodeLastSegment(p);
  }

  // =================== UI-TABLE (parent) ===================

  private computeRows() {
    this.rows = (this.documents || []).map(d => ({
      __doc: d,
      typeLabel: this.labelFor(d.typeDocument),
      statut: this.normalizeStatus(d.status),
      dateDepot: d.dateDepot,
      cheminFichier: d.cheminFichier
    }));
  }

  onActionTable(ev: { action: string; row: any }) {
    const { action, row } = ev;
    const doc: DocumentItem = row?.__doc;
    if (!doc) return;
    if (action === 'edit') { this.onEditDocument(doc); return; }
    if (action === 'delete') { this.onDeleteDocument(doc); return; }
  }

  /** URL pour les balises sécurisées (iframe/object/img) */
  getSafeUrl(path: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.buildUrl(path));
  }

  /** URL brute pour <a> (ouvrir/télécharger) */
  rawUrl(path?: string): string {
    return this.buildUrl(path);
  }

  /** (fallback simple si tu en as besoin ailleurs) */
  private toAbsoluteUrl(path: string): string {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    if (path.startsWith('/')) return path;
    return `/${path}`;
  }
}
