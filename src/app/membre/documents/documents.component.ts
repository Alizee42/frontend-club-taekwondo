import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface Utilisateur {
  id: number;
  nom: string;
  prenom: string;
  email: string;
}

interface Document {
  id: number;
  typeDocument: string;
  nomDocument: string;
  status: string;
  dateDepot: string;
}

@Component({
  selector: 'app-documents',
  standalone: true,
  templateUrl: './documents.component.html',
  styleUrls: ['./documents.component.css'],
  imports: [CommonModule, FormsModule]
})
export class DocumentsComponent implements OnInit {
  utilisateurConnecte: Utilisateur | null = null;
  documentType: string = 'certificat';
  selectedFile: File | null = null;
  documents: Document[] = [];

 requiredDocuments = [
  { type: 'certificat', label: 'Certificat médical', uploaded: false, etat: 'non_envoyé' },
  { type: 'photo', label: 'Photo d’identité', uploaded: false, etat: 'non_envoyé' },
  { type: 'identite', label: 'Document d’identité', uploaded: false, etat: 'non_envoyé' }
];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadUtilisateurConnecte();
  }

  loadUtilisateurConnecte(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Utilisateur non connecté.');
      return;
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.get<Utilisateur>('/api/utilisateurs/me', { headers }).subscribe({
      next: (utilisateur) => {
        this.utilisateurConnecte = utilisateur;
        localStorage.setItem('utilisateurId', utilisateur.id.toString());
        this.loadDocuments();
      },
      error: (err) => {
        console.error('Erreur utilisateur :', err);
        alert('Impossible de récupérer les informations de l\'utilisateur connecté.');
      }
    });
  }

  loadDocuments(): void {
    const utilisateurId = localStorage.getItem('utilisateurId');
    if (!utilisateurId) {
      alert('Utilisateur non connecté.');
      return;
    }

    this.http.get<Document[]>(`/api/documents/utilisateur/${utilisateurId}`).subscribe({
      next: (documents) => {
        this.documents = documents || [];
        this.updateRequiredDocumentsStatus();
      },
      error: (err) => {
        console.error('Erreur chargement documents :', err);
        alert('Erreur lors du chargement des documents.');
      }
    });
  }

 updateRequiredDocumentsStatus(): void {
  this.requiredDocuments.forEach(doc => {
    const match = this.documents.find(d => d.typeDocument === doc.type);
    if (match) {
      doc.uploaded = match.status !== 'refusé';
      doc['etat'] = match.status; // validé, en_attente, refusé
    } else {
      doc.uploaded = false;
      doc['etat'] = 'non_envoyé';
    }
  });
}


  isUploaded(type: string): boolean {
    return this.documents.some(d => d.typeDocument === type && d.status !== 'refusé');
  }

  isDocumentRefused(type: string): boolean {
    const doc = this.documents.find(d => d.typeDocument === type);
    return doc?.status === 'refusé';
  }

  isValidFile(file: File): boolean {
    const allowed = ['image/png', 'image/jpeg', 'application/pdf'];
    const max = 5 * 1024 * 1024; // 5 Mo
    return allowed.includes(file.type) && file.size <= max;
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
    formData.append('file', this.selectedFile);
    formData.append('typeDocument', this.documentType);
    formData.append('utilisateurId', utilisateurId);

    this.http.post('/api/documents', formData).subscribe({
      next: () => {
        alert('Document téléversé avec succès.');
        this.selectedFile = null;
        this.loadDocuments(); // ✅ recharge la liste
      },
      error: (err) => {
        console.error('Erreur téléversement :', err);
        alert('Erreur lors du téléversement du document.');
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  onEditDocument(document: Document): void {
    if (document.status === 'validé') {
      alert('Document validé, non modifiable.');
      return;
    }

    const doc = this.requiredDocuments.find(d => d.type === document.typeDocument);
    if (doc) doc.uploaded = false;

    alert(`Vous pouvez modifier ou remplacer le document : ${document.nomDocument}`);
  }

  onDeleteDocument(document: Document): void {
    if (document.status === 'validé') {
      alert('Document validé, non supprimable.');
      return;
    }

    if (confirm(`Supprimer le document : ${document.nomDocument} ?`)) {
      this.http.delete(`/api/documents/${document.id}`).subscribe({
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

 getStatusText(status: string): string {
  const normalised = status?.trim().toLowerCase().replace(/\s+/g, '_');
  switch (normalised) {
    case 'validé':
      return 'Validé';
    case 'refusé':
      return 'Refusé';
    case 'en_attente':
      return 'En attente de validation';
    default:
      return 'Inconnu';
  }
}

getStatusClass(status: string): string {
  const normalised = status?.trim().toLowerCase().replace(/\s+/g, '_');
  switch (normalised) {
    case 'validé':
      return 'status-validé';
    case 'refusé':
      return 'status-refusé';
    case 'en_attente':
      return 'status-en-attente';
    default:
      return '';
  }
}

getStatusIcon(status: string): string {
  const normalised = status?.trim().toLowerCase().replace(/\s+/g, '_');
  switch (normalised) {
    case 'validé':
      return 'ri-check-line';
    case 'refusé':
      return 'ri-close-line';
    case 'en_attente':
      return 'ri-time-line';
    default:
      return '';
  }
}
getDocumentStatusInfo(type: string): { text: string; class: string; tooltip?: string } {
  const doc = this.documents.find(d => d.typeDocument === type);
  if (!doc || !doc.status) {
    return { text: 'Non téléversé', class: 'not-uploaded' };
  }

  const raw = doc.status.trim().toLowerCase();
  const status = raw.replace(/\s+/g, '_');

  if (status === 'validé') {
    return { text: 'Validé', class: 'uploaded' };
  } else if (status === 'refusé') {
    return {
      text: 'Refusé',
      class: 'refused',
      tooltip: 'Document refusé. Veuillez téléverser un nouveau fichier.'
    };
  } else if (status === 'en_attente') {
    return { text: 'Téléversé', class: 'uploaded' };
  }

  return { text: 'Téléversé', class: 'uploaded' };
}
}
