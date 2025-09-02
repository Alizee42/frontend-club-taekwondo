import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClient, HttpClientModule, HttpHeaders, HttpParams } from '@angular/common/http';

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
}

interface RequiredDoc {
  type: string;
  label: string;
  uploaded?: boolean;
}

@Component({
  standalone: true,
  selector: 'app-documents-parent',
  templateUrl: './documents-parent.component.html',
  styleUrls: ['./documents-parent.component.css'],
  imports: [CommonModule, FormsModule, HttpClientModule, DatePipe],
})
export class DocumentsParentComponent implements OnInit {
  private readonly API_BASE = '/api';
  
  utilisateurConnecte: Utilisateur | null = null;

  // Enfants liés
  enfants: Enfant[] = [];
  selectedKidId: string | number | null = null;

  // Référentiel des documents requis
  requiredDocuments: RequiredDoc[] = [
    { type: 'CERTIFICAT_MEDICAL', label: 'Certificat médical (< 1 an)' },
    { type: 'QUESTIONNAIRE_SANTE', label: 'Questionnaire de santé' },
    { type: 'PHOTO_IDENTITE', label: "Photo d'identité" },
  ];

  // Formulaire d’upload
  documentType: string | null = null;
  selectedFile: File | null = null;

  // Liste des documents de l’enfant sélectionné
  documents: DocumentItem[] = [];

  // Aperçu
  previewing: DocumentItem | null = null;

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.loadParentAndKids();
  }

  // =================== LOAD ===================
  private loadParentAndKids(): void {
  console.log('Chargement des informations de l\'utilisateur connecté...');
  this.http.get<any>(`${this.API_BASE}/utilisateurs/me`, { headers: this.getAuthHeaders() }).subscribe({
    next: (u: any) => {
      console.log('Utilisateur connecté:', u);
      this.utilisateurConnecte = {
        id: u?.id ?? u?._id ?? u?.uuid,
        nom: (u?.nom ?? '').trim(),
        prenom: (u?.prenom ?? '').trim(),
        email: u?.email ?? '',
        role: String(u?.role ?? '').toUpperCase(),
      };

      if (this.utilisateurConnecte.role !== 'PARENT') {
        console.log('Utilisateur non parent, réinitialisation des enfants et documents');
        this.enfants = [];
        this.selectedKidId = null;
        this.documents = [];
        this.refreshRequiredUploaded();
        return;
      }

      // Charge les enfants liés à ce parent
      const params = new HttpParams().set('utilisateurId', String(this.utilisateurConnecte.id));
      this.http.get<any>(`${this.API_BASE}/membres`, { headers: this.getAuthHeaders(), params }).subscribe({
        next: (res: any) => {
          console.log('Enfants chargés:', res);
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

          // Sélectionne automatiquement le premier enfant s’il existe
          this.selectedKidId = this.enfants[0]?.id ?? null;
          console.log('Enfant sélectionné:', this.selectedKidId);
          if (this.selectedKidId != null) {
            this.loadDocumentsForKid(String(this.selectedKidId));
          } else {
            this.documents = [];
            this.refreshRequiredUploaded();
          }
        },
        error: (err) => {
          console.error('Erreur lors du chargement des enfants:', err);
          this.enfants = [];
          this.selectedKidId = null;
          this.documents = [];
          this.refreshRequiredUploaded();
        }
      });
    },
    error: (err) => {
      console.error('Erreur lors du chargement de l\'utilisateur:', err);
      this.utilisateurConnecte = null;
      this.enfants = [];
      this.selectedKidId = null;
      this.documents = [];
      this.refreshRequiredUploaded();
    }
  });
}


  private getAuthHeaders() {
    const token = localStorage.getItem('token');  // Assurez-vous que le token est stocké sous le nom 'token'
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  onSelectKid(): void {
    console.log('Sélection de l\'enfant:', this.selectedKidId);
    if (this.selectedKidId == null) {
      this.documents = [];
      this.refreshRequiredUploaded();
      return;
    }
    this.loadDocumentsForKid(String(this.selectedKidId));
  }

  private loadDocumentsForKid(kidId: string): void {
    console.log('Chargement des documents pour l\'enfant ID:', kidId);
    const params = new HttpParams().set('utilisateurId', kidId);
    this.http.get<any>(`${this.API_BASE}/documents`, { headers: this.getAuthHeaders(), params }).subscribe({
      next: (res: any) => {
        console.log('Documents chargés:', res);
        const arr: any[] = Array.isArray(res) ? res
          : Array.isArray(res?.items) ? res.items
          : Array.isArray(res?.data) ? res.data
          : Array.isArray(res?.results) ? res.results
          : Array.isArray(res?.documents) ? res.documents
          : [];
        this.documents = arr.map(this.mapDoc);
        this.refreshRequiredUploaded();
      },
      error: (err) => {
        console.error('Erreur lors du chargement des documents:', err);
        this.documents = [];
        this.refreshRequiredUploaded();
      }
    });
  }

  private mapDoc = (d: any): DocumentItem => {
    console.log('Mapping du document:', d);
    return {
      id: d?.id ?? d?._id ?? d?.uuid,
      typeDocument: d?.typeDocument ?? d?.type ?? '',
      nomDocument: d?.nomDocument ?? d?.filename ?? d?.nom ?? '',
      status: this.normalizeStatus(d?.status ?? d?.statut ?? 'en_attente'),
      dateDepot: d?.dateDepot ?? d?.createdAt ?? new Date().toISOString(),
      cheminFichier: d?.cheminFichier ?? d?.url ?? '',
      commentaire: d?.commentaire ?? d?.message ?? undefined,
      utilisateurId: d?.utilisateurId ?? d?.userId ?? undefined,
    };
  };

  private normalizeStatus(s: any): StatutDoc {
    console.log('Normalisation du statut:', s);
    const v = String(s || '').toLowerCase();
    if (['valide', 'validé', 'validee', 'validée', 'approved'].includes(v)) return 'validé';
    if (['pending', 'en_attente', 'en attente', 'attente'].includes(v)) return 'en_attente';
    if (['refuse', 'refusé', 'refusee', 'refusée', 'rejected'].includes(v)) return 'refusé';
    return 'en_attente';
  }

  private refreshRequiredUploaded(): void {
    console.log('Rafraîchissement des documents requis et uploadés');
    const set = new Set(this.documents.map(d => d.typeDocument));
    this.requiredDocuments = this.requiredDocuments.map(r => ({ ...r, uploaded: set.has(r.type) }));
  }

  // =================== UPLOAD ===================
  onFileSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.selectedFile = (input?.files && input.files.length > 0) ? input.files[0] : null;
    console.log('Fichier sélectionné:', this.selectedFile);
  }

  isValidFile(file: File | null): boolean {
    if (!file) return false;
    const okType = /\.(pdf|png|jpe?g)$/i.test(file.name);
    const okSize = file.size <= 5 * 1024 * 1024; // 5 Mo
    console.log('Validation du fichier:', okType, okSize);
    return okType && okSize;
  }

  onUploadDocumentForKid(): void {
    console.log('Upload du document pour l\'enfant ID:', this.selectedKidId);
    if (!this.selectedKidId || !this.documentType || !this.selectedFile || !this.isValidFile(this.selectedFile)) return;

    const fd = new FormData();
    fd.append('utilisateurId', String(this.selectedKidId));
    fd.append('typeDocument', this.documentType);
    fd.append('fichier', this.selectedFile);

    this.http.post<any>(`${this.API_BASE}/documents`, fd, { headers: this.getAuthHeaders() }).subscribe({
      next: (created: any) => {
        console.log('Document créé:', created);
        const doc = this.mapDoc(created);
        // Fallback local si l’API ne renvoie pas tout
        if (!doc.id) {
          (doc as any).id = `tmp_${Date.now()}`;
          doc.utilisateurId = this.selectedKidId!;
        }
        this.documents = [doc, ...this.documents];
        this.documentType = null;
        this.selectedFile = null;
        this.refreshRequiredUploaded();
      },
      error: () => { console.error('Erreur lors de l\'upload du document'); }
    });
  }

  // =================== EDIT / DELETE ===================
  onEditDocument(doc: DocumentItem): void {
    if (!doc || doc.status === 'validé') return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.png,.jpg,.jpeg';
    input.onchange = () => {
      const file = (input.files && input.files[0]) ? input.files[0] : null;
      if (!file || !this.isValidFile(file)) return;

      const fd = new FormData();
      fd.append('fichier', file);

      this.http.put<any>(`${this.API_BASE}/documents/${doc.id}`, fd, { headers: this.getAuthHeaders() }).subscribe({
        next: (updated: any) => {
          console.log('Document mis à jour:', updated);
          const mapped = this.mapDoc(updated);
          this.documents = this.documents.map(d => d.id === doc.id ? mapped : d);
          this.refreshRequiredUploaded();
        },
        error: () => { console.error('Erreur lors de la mise à jour du document'); }
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
        console.log('Document supprimé:', doc.id);
        this.documents = this.documents.filter(d => d.id !== doc.id);
        this.refreshRequiredUploaded();
      },
      error: () => {
        console.error('Erreur lors de la suppression du document');
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
    const docs = this.documents.filter(d => d.typeDocument === type);
    if (docs.some(d => this.normalizeStatus(d.status) === 'validé')) return { state: 'validé', text: 'Validé' };
    if (docs.some(d => this.normalizeStatus(d.status) === 'refusé')) {
      const refused = docs.find(d => this.normalizeStatus(d.status) === 'refusé');
      return { state: 'refusé', text: 'Refusé', tooltip: refused?.commentaire || 'Document refusé' };
    }
    if (docs.length > 0) return { state: 'en_attente', text: 'En attente' };
    return { state: 'en_attente', text: 'Non transmis' };
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

  getSafeUrl(path: string): SafeResourceUrl {
    const url = this.toAbsoluteUrl(path);
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  private toAbsoluteUrl(path: string): string {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    if (path.startsWith('/')) return path;
    return `/${path}`;
  }
}
