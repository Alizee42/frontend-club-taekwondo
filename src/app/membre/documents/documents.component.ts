import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { RequiredDocsService, RequiredDocConfig } from '../../shared/documents/required-docs.service';
import { DOC_CATALOG } from '../../shared/documents/doc-utils';
import { UiTableComponent, UiTableColumn } from '../../shared/components/ui-table/ui-table.component';
import { UiTitleComponent } from '../../shared/ui/title/ui-title.component';
import { UiModalComponent } from '../../shared/ui/modal/ui-modal.component';

/* =========================
   Types & interfaces
   ========================= */
type StatutDoc = 'validé' | 'refusé' | 'en_attente' | string;

interface Utilisateur {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  clubId?: number;
}

interface DocumentItem {
  id: number;
  typeDocument: string;
  nomDocument: string;
  status: StatutDoc;
  dateDepot: string;
  cheminFichier?: string;
}

interface RequiredDoc {
  type: string;
  label: string;
  uploaded: boolean;
  etat: 'validé' | 'en_attente' | 'refusé' | 'non_envoyé';
}

const LABEL_BY_CODE: Record<string, string> =
  DOC_CATALOG.reduce((acc, t) => (acc[t.code] = t.label, acc), {} as Record<string, string>);

function unifyType(input: any): string {
  const raw = String(input || '').trim();
  if (!raw) return raw;
  if (DOC_CATALOG.some(t => t.code === raw)) return raw;

  const norm = raw
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[\s'’_-]+/g, '');

  for (const t of DOC_CATALOG) {
    const candidates = [t.code, t.label, ...(t.aliases || [])];
    if (candidates.some(c =>
      String(c)
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[\s'’_-]+/g, '') === norm
    )) {
      return t.code;
    }
  }
  return raw;
}

function labelFor(code: string) {
  return LABEL_BY_CODE[code] || code;
}

@Component({
  selector: 'app-documents',
  standalone: true,
  templateUrl: './documents.component.html',
  styleUrls: ['./documents.component.css'],
  imports: [CommonModule, FormsModule, UiTitleComponent, UiTableComponent, UiModalComponent]
})
export class DocumentsComponent implements OnInit {
    private readonly API_BASE = environment.apiUrl;

  utilisateurConnecte: Utilisateur | null = null;

  // ⚠️ Valeur envoyée au backend : utiliser les CODES du catalogue
  documentType: string = 'CERTIFICAT_MEDICAL';
  selectedFile: File | null = null;

  documents: DocumentItem[] = [];
  // ui-table configuration
  tableColumns: UiTableColumn[] = [];
  tableActions: Array<{ label: string; icon?: string; action: string; color?: string; show?: (row: any) => boolean; title?: string }> = [];
  rows: any[] = [];

  // “Documents obligatoires” uniformisés (même référentiel que Parent)
  requiredDocuments: RequiredDoc[] = [
    { type: 'CERTIFICAT_MEDICAL', label: 'Certificat médical (< 1 an)', uploaded: false, etat: 'non_envoyé' },
    { type: 'PHOTO_IDENTITE',     label: "Photo d'identité",            uploaded: false, etat: 'non_envoyé' },
    { type: 'DOCUMENT_IDENTITE',  label: "Document d'identité",         uploaded: false, etat: 'non_envoyé' }
  ];

  constructor(private http: HttpClient, private requiredSvc: RequiredDocsService, private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    // Prépare la table tôt pour afficher la colonne Actions immédiatement
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
      { label: 'Modifier', icon: 'ri-pencil-line', action: 'edit', color: '#334155', show: (row: any) => this.normalizeStatus(row.statut) !== 'validé', title: 'Modifier' },
      { label: 'Supprimer', icon: 'ri-delete-bin-line', action: 'delete', color: '#dc2626', show: (row: any) => this.normalizeStatus(row.statut) !== 'validé', title: 'Supprimer' }
    ];

    this.loadUtilisateurConnecte();
  }

  /* =========================
     LOAD
     ========================= */
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token && token !== 'null' && token !== 'undefined') {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  loadUtilisateurConnecte(): void {
    const headers = this.getAuthHeaders();
    if (!headers.has('Authorization')) {
      alert('Utilisateur non connecté.');
      return;
    }

    this.http.get<Utilisateur>(`${this.API_BASE}/utilisateurs/me`, { headers }).subscribe({
      next: (utilisateur) => {
        this.utilisateurConnecte = utilisateur;
        localStorage.setItem('utilisateurId', utilisateur.id.toString());
        // Charger la config "documents requis" par club (si dispo)
        const clubId = (utilisateur as any).clubId ?? this.utilisateurConnecte?.clubId ?? null;
        this.loadRequiredConfig(clubId as number | null);
        this.loadDocuments();
      },
      error: (err) => {
        console.error('Erreur utilisateur :', err);
        alert('Impossible de récupérer les informations de l’utilisateur connecté.');
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
              .map(it => ({ type: it.code, label: it.label, uploaded: false, etat: 'non_envoyé' }));
            this.updateRequiredDocumentsStatus();
            return;
          }
          // fallback
          this.requiredDocuments = DOC_CATALOG.map(t => ({ type: t.code, label: t.label, uploaded: false, etat: 'non_envoyé' }));
          this.updateRequiredDocumentsStatus();
        },
        error: () => {
          this.requiredDocuments = DOC_CATALOG.map(t => ({ type: t.code, label: t.label, uploaded: false, etat: 'non_envoyé' }));
          this.updateRequiredDocumentsStatus();
        }
      });
    } else {
      this.requiredDocuments = DOC_CATALOG.map(t => ({ type: t.code, label: t.label, uploaded: false, etat: 'non_envoyé' }));
      this.updateRequiredDocumentsStatus();
    }
  }

  loadDocuments(): void {
    const utilisateurId = localStorage.getItem('utilisateurId');
    if (!utilisateurId) {
      alert('Utilisateur non connecté.');
      return;
    }

    this.http.get<DocumentItem[]>(`${this.API_BASE}/documents/utilisateur/${utilisateurId}`, { headers: this.getAuthHeaders() }).subscribe({
      next: (documents) => {
        const arr = Array.isArray(documents) ? documents : [];
        // normalise les types et statuts
        this.documents = arr.map(d => ({
          ...d,
          typeDocument: unifyType(d.typeDocument),
          status: this.normalizeStatus(d.status),
          cheminFichier: (d as any).cheminFichier || (d as any).path || (d as any).fichier || null
        }));
        this.computeRows();
        this.updateRequiredDocumentsStatus();
      },
      error: (err) => {
        console.error('Erreur chargement documents :', err);
        alert('Erreur lors du chargement des documents.');
        this.documents = [];
        this.rows = [];
        this.updateRequiredDocumentsStatus();
      }
    });
  }

  /* =========================
     STATUS / MAPPING
     ========================= */
  private normalizeStatus(s: any): StatutDoc {
    const v = String(s || '').toLowerCase();
    if (['valide', 'validé', 'validee', 'validée', 'approved'].includes(v)) return 'validé';
    if (['pending', 'en_attente', 'en attente', 'attente'].includes(v)) return 'en_attente';
    if (['refuse', 'refusé', 'refusee', 'refusée', 'rejected'].includes(v)) return 'refusé';
    return 'en_attente';
  }

  updateRequiredDocumentsStatus(): void {
    this.requiredDocuments = this.requiredDocuments.map(req => {
      const code = req.type;
      const docsOfType = this.documents.filter(d => unifyType(d.typeDocument) === code);
      if (docsOfType.length === 0) {
        return { ...req, uploaded: false, etat: 'non_envoyé' };
      }
      // s'il existe au moins un doc validé -> validé
      if (docsOfType.some(d => this.normalizeStatus(d.status) === 'validé')) {
        return { ...req, uploaded: true, etat: 'validé' };
      }
      // un doc refusé -> refusé
      if (docsOfType.some(d => this.normalizeStatus(d.status) === 'refusé')) {
        return { ...req, uploaded: false, etat: 'refusé' };
      }
      // sinon en attente
      return { ...req, uploaded: true, etat: 'en_attente' };
    });
  }

  isUploaded(type: string): boolean {
    const code = unifyType(type);
    const docs = this.documents.filter(d => unifyType(d.typeDocument) === code);
    if (docs.length === 0) return false;
    if (docs.some(d => this.normalizeStatus(d.status) === 'refusé')) return false;
    return true;
  }

  isDocumentRefused(type: string): boolean {
    const code = unifyType(type);
    return this.documents.some(d => unifyType(d.typeDocument) === code && this.normalizeStatus(d.status) === 'refusé');
  }

  getStatusText(status: string): string {
    switch (this.normalizeStatus(status)) {
      case 'validé': return 'Validé';
      case 'refusé': return 'Refusé';
      default: return 'En attente';
    }
  }

  /** Pour les "chips" (Documents obligatoires) – même logique que Parent. */
  getDocumentStatusInfo(type: string): { state: 'validé' | 'refusé' | 'en_attente', text: string, tooltip?: string } {
    const code = unifyType(type);
    const docs = this.documents.filter(d => unifyType(d.typeDocument) === code);

    const hasValid = docs.some(d => this.normalizeStatus(d.status) === 'validé');
    const hasRefused = docs.some(d => this.normalizeStatus(d.status) === 'refusé');
    const hasPending = docs.some(d => this.normalizeStatus(d.status) === 'en_attente');

    if (hasValid) return { state: 'validé', text: 'Validé' };
    if (hasRefused) {
      const refused = docs.find(d => this.normalizeStatus(d.status) === 'refusé');
      return { state: 'refusé', text: 'Refusé', tooltip: refused ? 'Document refusé' : undefined };
    }
    if (hasPending) return { state: 'en_attente', text: 'En attente' };

    // Aucun document fourni -> “Non transmis” (état rouge côté style)
    return { state: 'refusé', text: 'Non transmis' };
  }

  /* =========================
     UPLOAD / EDIT / DELETE
     ========================= */
  isValidFile(file: File): boolean {
    const allowed = ['image/png', 'image/jpeg', 'application/pdf'];
    const max = 5 * 1024 * 1024; // 5 Mo
    return allowed.includes(file.type) && file.size <= max;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  onUploadDocument(): void {
    if (!this.selectedFile) {
      alert('Veuillez sélectionner un fichier.');
      return;
    }
    if (!this.isValidFile(this.selectedFile)) {
      alert('Fichier invalide (format ou taille).');
      return;
    }

    const utilisateurId = localStorage.getItem('utilisateurId');
    if (!utilisateurId) {
      alert('Utilisateur non connecté.');
      return;
    }

    const formData = new FormData();
    // ⚠️ clés backend attendues : file / typeDocument / utilisateurId
    formData.append('file', this.selectedFile);
    formData.append('typeDocument', this.documentType);   // ex: "DOCUMENT_IDENTITE"
    formData.append('utilisateurId', utilisateurId);

    this.http.post(`${this.API_BASE}/documents`, formData, { headers: this.getAuthHeaders() }).subscribe({
      next: () => {
        alert('Document téléversé avec succès.');
        this.selectedFile = null;
        this.loadDocuments(); // recharge la liste
      },
      error: (err) => {
        console.error('Erreur téléversement :', err);
        alert('Erreur lors du téléversement du document.');
      }
    });
  }

  // ✅ Ne pas ombrer l’objet global "document"
  onEditDocument(doc: DocumentItem): void {
    if (this.normalizeStatus(doc.status) === 'validé') {
      alert('Document validé, non modifiable.');
      return;
    }

    const inputEl = document.createElement('input');
    inputEl.type = 'file';
    inputEl.accept = '.pdf,.png,.jpg,.jpeg';

    inputEl.onchange = () => {
      const file = inputEl.files?.[0] ?? null;
      if (!file || !this.isValidFile(file)) return;

      const fd = new FormData();
      fd.append('file', file);

      this.http.put(`${this.API_BASE}/documents/${doc.id}/file`, fd, { headers: this.getAuthHeaders() })
        .subscribe({
          next: () => {
            alert('Document remplacé.');
            this.loadDocuments();
          },
          error: (err) => {
            console.error('Erreur remplacement :', err);
            alert('Erreur lors du remplacement du document.');
          }
        });
    };

    inputEl.click();
  }

  onDeleteDocument(doc: DocumentItem): void {
    if (this.normalizeStatus(doc.status) === 'validé') {
      alert('Document validé, non supprimable.');
      return;
    }

    if (confirm(`Supprimer le document : ${doc.nomDocument} ?`)) {
      this.http.delete(`${this.API_BASE}/documents/${doc.id}`, { headers: this.getAuthHeaders() }).subscribe({
        next: () => {
          alert('Document supprimé.');
          this.loadDocuments();
        },
        error: (err) => {
          console.error('Erreur suppression :', err);
          alert('Erreur lors de la suppression du document.');
        }
      });
    }
  }

  /* =========================
     Utils pour le template
     ========================= */
  labelFor(code: string) { return labelFor(code); }

  // =========================
  // ui-table wiring
  // =========================

  private computeRows() {
    this.rows = (this.documents || []).map(d => ({
      __doc: d,
      typeLabel: labelFor(d.typeDocument),
      nomDocument: d.nomDocument,
      statut: d.status,
      dateDepot: (d as any).dateDepot ?? (d as any).date,
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

  // =========================
  // Aperçu (UiModal)
  // =========================
  previewing: DocumentItem | null = null;
  onPreview(doc: DocumentItem) {
    this.previewing = doc;
  }
  closePreview() {
    this.previewing = null;
  }

  /** Nettoie et construit l’URL absolue du fichier côté API */
  private encodeLastSegment(path: string): string {
    if (!path) return '';
    const parts = path.split('/');
    const last = encodeURIComponent(parts.pop() || '');
    return [...parts, last].join('/');
  }
  private buildUrl(path?: string): string {
    if (!path) return '';
    let p = String(path);
    // normalisations usuelles
    if (p.startsWith('documents/')) p = `uploads/${p}`;
    if (!p.startsWith('uploads/')) p = `uploads/documents/${p}`;
    if (!p.startsWith('/')) p = `/${p}`;
    if (!p.startsWith('/api/')) p = `/api${p}`;
    return this.encodeLastSegment(p);
  }
  getSafeUrl(path: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.buildUrl(path));
  }
  rawUrl(path?: string): string {
    return this.buildUrl(path);
  }
  isPdf(path?: string): boolean {
    if (!path) return false;
    return /\.pdf($|\?)/i.test(path);
  }
}
