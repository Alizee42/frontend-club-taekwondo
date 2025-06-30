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
    { type: 'certificat', label: 'Certificat médical', uploaded: false },
    { type: 'photo', label: 'Photo d’identité', uploaded: false },
    { type: 'identite', label: 'Document d’identité', uploaded: false }
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

    this.http.get<Utilisateur>('http://localhost:8080/api/utilisateurs/me', { headers }).subscribe({
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

    this.http.get<Document[]>(`http://localhost:8080/api/documents/utilisateur/${utilisateurId}`).subscribe({
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
      const found = this.documents.find(d => d.typeDocument === doc.type);
      doc.uploaded = !!(found && found.status === 'validé');
    });
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

    this.http.post('http://localhost:8080/api/documents', formData).subscribe({
      next: () => {
        alert('Document téléversé avec succès.');
        this.loadDocuments();
        this.selectedFile = null;
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
      this.http.delete(`http://localhost:8080/api/documents/${document.id}`).subscribe({
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

  getStatusClass(status: string): string {
    switch (status) {
      case 'validé': return 'status-validé';
      case 'en attente': return 'status-en-attente';
      case 'refusé': return 'status-refusé';
      default: return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'validé': return 'fas fa-check-circle';
      case 'en attente': return 'fas fa-clock';
      case 'refusé': return 'fas fa-times-circle';
      default: return '';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'validé': return 'Validé';
      case 'en attente': return 'En attente de validation';
      case 'refusé': return 'Refusé';
      default: return 'Statut inconnu';
    }
  }
}
