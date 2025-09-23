import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';


type StatutDoc = 'validé' | 'refusé' | 'en_attente' | string;

interface Utilisateur {
  id: number | string;
  nom: string;
  prenom: string;
  email?: string;
  role?: string;
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
   Catalogue & helpers types
   ========================= */
const DOC_CATALOG: Array<{ code: string; label: string; aliases?: string[] }> = [
  {
    code: 'CERTIFICAT_MEDICAL',
    label: 'Certificat médical (< 1 an)',
    aliases: ['CERTIF_MEDICAL', 'CERTIFICAT', 'MEDICAL']
  },
  {
    code: 'PHOTO_IDENTITE',
    label: "Photo d'identité",
    aliases: ["PHOTO D'IDENTITE", 'PHOTO_IDENTITÉ', 'PHOTO', 'PHOTOGRAPHIE', "PHOTO D'IDENTITÉ"]
  },
  {
    code: 'DOCUMENT_IDENTITE',
    label: "Document d'identité",
    aliases: [
      'PIECE_IDENTITE', "PIÈCE D'IDENTITÉ", 'CARTE_IDENTITE', "CARTE D'IDENTITÉ",
      'CNI', 'PASSEPORT', 'JUSTIFICATIF_IDENTITE', 'JUSTIFICATIF IDENTITE'
    ]
  }
];

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
  standalone: true,
  selector: 'app-documents-parent',
  templateUrl: './documents-parent.component.html',
  styleUrls: ['./documents-parent.component.css'],
  imports: [CommonModule, FormsModule, DatePipe],
})
export class DocumentsParentComponent implements OnInit {
  private readonly API_BASE = environment.apiUrl;

  utilisateurConnecte: Utilisateur | null = null;

  // Enfants liés
  enfants: Enfant[] = [];
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

  // Aperçu
  previewing: DocumentItem | null = null;

  // Expose helper au template
  labelFor = labelFor;

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.loadParentAndKids();
  }

  // =================== LOAD ===================
  private loadParentAndKids(): void {
    this.http.get<any>(`${this.API_BASE}/utilisateurs/me`, { headers: this.getAuthHeaders() }).subscribe({
      next: (u: any) => {
        this.utilisateurConnecte = {
          id: u?.id ?? u?._id ?? u?.uuid,
          nom: (u?.nom ?? '').trim(),
          prenom: (u?.prenom ?? '').trim(),
          email: u?.email ?? '',
          role: String(u?.role ?? '').toUpperCase(),
        };

        if (this.utilisateurConnecte.role !== 'PARENT') {
          this.enfants = [];
          this.selectedKidId = null;
          this.documents = [];
          this.refreshRequiredUploaded();
          return;
        }

        // Enfants du parent connecté
        this.http.get<any>(`${this.API_BASE}/membres/mes-enfants`, { headers: this.getAuthHeaders() }).subscribe({
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

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token && token !== 'null' && token !== 'undefined') {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
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
    this.http.get<any>(`${this.API_BASE}/documents/membre/${kidId}`, { headers: this.getAuthHeaders() }).subscribe({
      next: (res: any) => {
        const arr: any[] = Array.isArray(res) ? res
          : Array.isArray(res?.items) ? res.items
          : Array.isArray(res?.data) ? res.data
          : Array.isArray(res?.results) ? res.results
          : Array.isArray(res?.documents) ? res.documents
          : [];
        this.documents = arr.map(this.mapDoc);
        this.refreshRequiredUploaded();
      },
      error: () => {
        this.documents = [];
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

  private normalizeStatus(s: any): StatutDoc {
    const v = String(s || '').toLowerCase();
    if (['valide', 'validé', 'validee', 'validée', 'approved'].includes(v)) return 'validé';
    if (['pending', 'en_attente', 'en attente', 'attente'].includes(v)) return 'en_attente';
    if (['refuse', 'refusé', 'refusee', 'refusée', 'rejected'].includes(v)) return 'refusé';
    return 'en_attente';
  }

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

    this.http.post<any>(`${this.API_BASE}/documents`, fd, { headers: this.getAuthHeaders() }).subscribe({
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
        this.refreshRequiredUploaded();
      },
      error: () => {}
    });
  }

  // =================== EDIT / DELETE ===================
  onEditDocument(doc: DocumentItem): void {
    if (!doc || this.normalizeStatus(doc.status) === 'validé') return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.png,.jpg,.jpeg';
    input.onchange = () => {
      const file = (input.files && input.files[0]) ? input.files[0] : null;
      if (!file || !this.isValidFile(file)) return;

      const fd = new FormData();
      fd.append('file', file);

      this.http.put<any>(`${this.API_BASE}/documents/${doc.id}/file`, fd, { headers: this.getAuthHeaders() }).subscribe({
        next: (updated: any) => {
          const mapped = this.mapDoc(updated);
          this.documents = this.documents.map(d => d.id === doc.id ? mapped : d);
          this.refreshRequiredUploaded();
        },
        error: () => {}
      });
    };
    input.click();
  }

  onDeleteDocument(doc: DocumentItem): void {
    if (!doc) return;
    const ok = confirm(`Supprimer le document "${doc.nomDocument}" ?`);
    if (!ok) return;

    this.http.delete(`${this.API_BASE}/documents/${doc.id}`, { observe: 'response', headers: this.getAuthHeaders() }).subscribe({
      next: () => {
        this.documents = this.documents.filter(d => d.id !== doc.id);
        this.refreshRequiredUploaded();
      },
      error: () => {
        // on retire quand même en cas d'erreur côté affichage
        this.documents = this.documents.filter(d => d.id !== doc.id);
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
