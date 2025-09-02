import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule, NgClass, NgFor, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

/* ========= Types ========= */
type StatutDoc = 'validé' | 'refusé' | 'en_attente' | string;

interface DocumentItem {
  id: number | string;
  typeDocument: string;
  nomDocument: string;
  status: StatutDoc;
  dateDepot?: string | Date;
  cheminFichier?: string;
  utilisateur?: {
    id: number | string;
    nom: string;
    prenom: string;
    email: string;
    telephone?: string;
  };
  utilisateurId?: number | string;
  membreId?: number | string;
  commentaire?: string;
}

interface UtilisateurRow {
  id: number | string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  isOpen: boolean;
  documents: DocumentItem[];
}

/* ===== Catalogue & helpers libellés ===== */
const DOC_CATALOG: Array<{ code: string; label: string; aliases?: string[] }> = [
  { code: 'CERTIFICAT_MEDICAL', label: 'Certificat médical (< 1 an)', aliases: ['CERTIF_MEDICAL','CERTIFICAT','MEDICAL'] },
  { code: 'PHOTO_IDENTITE',     label: "Photo d'identité",             aliases: ["PHOTO D'IDENTITE","PHOTO IDENTITE","PHOTO","PHOTOGRAPHIE","PHOTO D'IDENTITÉ"] },
  { code: 'DOCUMENT_IDENTITE',  label: "Document d'identité",          aliases: ['PIECE_IDENTITE',"PIÈCE D'IDENTITÉ",'CARTE_IDENTITE',"CARTE D'IDENTITÉ",'CNI','PASSEPORT','JUSTIFICATIF IDENTITE','JUSTIFICATIF_IDENTITE'] }
];

const LABEL_BY_CODE: Record<string, string> =
  DOC_CATALOG.reduce((acc, t) => { acc[t.code] = t.label; return acc; }, {} as Record<string, string>);

function unifyType(input: any): string {
  const raw = String(input || '').trim();
  if (!raw) return raw;
  if (DOC_CATALOG.some(t => t.code === raw)) return raw;

  const norm = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                 .toLowerCase().replace(/[\s'’_-]+/g, '');

  for (const t of DOC_CATALOG) {
    const candidates = [t.code, t.label, ...(t.aliases || [])];
    if (candidates.some(c =>
      String(c).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
             .toLowerCase().replace(/[\s'’_-]+/g, '') === norm)) {
      return t.code;
    }
  }
  return raw;
}
function labelFor(code: string) { return LABEL_BY_CODE[code] || code; }

/* ========= Composant ========= */
@Component({
  selector: 'app-gestion-documents',
  templateUrl: './gestion-documents.component.html',
  styleUrls: ['./gestion-documents.component.css'],
  standalone: true,
  imports: [CommonModule, NgClass, NgFor, DatePipe, FormsModule],
})
export class GestionDocumentsComponent implements OnInit {
  private readonly API_BASE = '/api';

  utilisateurs: UtilisateurRow[] = [];
  utilisateursFiltres: UtilisateurRow[] = [];

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

  /* ===== Helpers HTTP (Bearer) ===== */
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token && token !== 'null' && token !== 'undefined') {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  /* ===== Normalisation statut ===== */
  private normalizeStatus(s: any): StatutDoc {
    const v = String(s || '').toLowerCase();
    if (['valide','validé','validee','validée','approved'].includes(v)) return 'validé';
    if (['pending','en_attente','en attente','attente'].includes(v)) return 'en_attente';
    if (['refuse','refusé','refusee','refusée','rejected'].includes(v)) return 'refusé';
    return 'en_attente';
  }

  /* ===== Chargement & groupage ===== */
  loadDocuments() {
    this.http.get<any[]>(`${this.API_BASE}/documents`, { headers: this.getAuthHeaders() }).subscribe({
      next: (docsRaw) => {
        const utilisateursMap = new Map<string | number, UtilisateurRow>();

        (docsRaw || []).forEach((d: any) => {
          const doc: DocumentItem = {
            id: d?.id ?? d?._id ?? d?.uuid,
            typeDocument: unifyType(d?.typeDocument ?? d?.type ?? ''),
            nomDocument: d?.nomDocument ?? d?.filename ?? d?.nom ?? '',
            status: this.normalizeStatus(d?.status ?? d?.statut ?? 'en_attente'),
            dateDepot: d?.dateDepot ?? d?.createdAt,
            cheminFichier: d?.cheminFichier ?? d?.url,
            utilisateur: d?.utilisateur,
            utilisateurId: d?.utilisateurId ?? d?.utilisateur?.id
          };

        const u = d?.utilisateur;
        if (u?.id) {
          const uid = u.id as number | string;
          if (!utilisateursMap.has(uid)) {
            utilisateursMap.set(uid, {
              id: uid,
              nom: (u.nom || '').trim(),
              prenom: (u.prenom || '').trim(),
              email: u.email || '—',
              telephone: u.telephone || '',
              isOpen: false,
              documents: []
            });
          }
          utilisateursMap.get(uid)!.documents.push(doc);
        } else {
          console.warn('Document sans utilisateur associé :', d);
        }
      });

        // liste triée par nom/prénom
        this.utilisateurs = Array.from(utilisateursMap.values()).sort((a, b) =>
          `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr', { sensitivity: 'base' })
        );
        this.utilisateursFiltres = [...this.utilisateurs];
      },
      error: (err) => {
        console.error('Erreur lors du chargement des documents :', err);
        this.utilisateurs = [];
        this.utilisateursFiltres = [];
      },
    });
  }

  /* ===== Accordéon ===== */
  toggleAccordion(utilisateur: UtilisateurRow) {
    utilisateur.isOpen = !utilisateur.isOpen;
  }

  /* ===== Actions document ===== */
  validerDocument(doc: DocumentItem) {
    this.http.put(`${this.API_BASE}/documents/${doc.id}/valider`, {}, { headers: this.getAuthHeaders() })
      .subscribe({
        next: () => { doc.status = 'validé'; },
        error: (err) => console.error('Erreur lors de la validation :', err),
      });
  }

  refuserDocument(doc: DocumentItem) {
    this.http.put(`${this.API_BASE}/documents/${doc.id}/refuser`, {}, { headers: this.getAuthHeaders() })
      .subscribe({
        next: () => { doc.status = 'refusé'; },
        error: (err) => console.error('Erreur lors du refus :', err),
      });
  }

  validerTous(utilisateur: UtilisateurRow) {
    utilisateur.documents
      .filter(d => this.normalizeStatus(d.status) === 'en_attente')
      .forEach(d => this.validerDocument(d));
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

  /* ===== Filtre ===== */
  filtrerUtilisateurs() {
    const term = this.searchTerm.trim().toLowerCase();
    const stat = this.filtreStatut;

    this.utilisateursFiltres = this.utilisateurs.filter(u => {
      const txt = `${u.nom} ${u.prenom} ${u.email} ${u.telephone || ''}`.toLowerCase();
      const matchText = !term || txt.includes(term);
      const matchStat = !stat || u.documents.some(d => this.normalizeStatus(d.status) === stat);
      return matchText && matchStat;
    });
  }

  /* ===== Aperçu ===== */
  ouvrirApercu(doc: DocumentItem) { this.documentEnApercu = doc; }
  fermerApercu() { this.documentEnApercu = null; }

  getSafeUrl(path: string | undefined): SafeResourceUrl {
    if (!path) return this.sanitizer.bypassSecurityTrustResourceUrl('');
    // normalise quelques variantes courantes provenant du backend
    let p = path.replace(/^documents\//, '');
    // si déjà absolu (http/https) → laisser
    if (/^https?:\/\//i.test(p)) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(p);
    }
    // si le backend sert via /api/uploads/documents/...
    if (!p.startsWith('/')) p = `/api/uploads/documents/${encodeURIComponent(p)}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(p);
  }

  estImage(nom: string | undefined): boolean {
    return !!nom && /\.(png|jpe?g|gif|bmp|webp)$/i.test(nom);
  }

  // expose helper au template si besoin
  labelFor(code: string) { return labelFor(code); }
}
