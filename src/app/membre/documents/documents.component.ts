import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

// Interface pour représenter un utilisateur
interface Utilisateur {
  id: number;
  nom: string;
  prenom: string;
  email: string;
}

// Interface pour représenter un document
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
export class DocumentsComponent {
  utilisateurConnecte: Utilisateur | null = null; // Remplace membreConnecte
  documentType: string = 'certificat'; // Type de document sélectionné
  selectedFile: File | null = null; // Fichier sélectionné
  documents: Document[] = []; // Liste des documents
  requiredDocuments = [
    { type: 'certificat', label: 'Certificat médical', uploaded: false },
    { type: 'photo', label: 'Photo d’identité', uploaded: false },
    { type: 'identite', label: 'Document d’identité', uploaded: false }
  ]; // Liste des documents obligatoires

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadUtilisateurConnecte();
  }

  // Charger l'utilisateur connecté
  loadUtilisateurConnecte() {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Utilisateur non connecté.');
      return;
    }

    this.http.get<Utilisateur>('http://localhost:8080/api/utilisateurs/me', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (utilisateur) => {
        this.utilisateurConnecte = utilisateur;
        localStorage.setItem('utilisateurId', utilisateur.id.toString());
        this.loadDocuments();
      },
      error: (err) => {
        console.error('Erreur lors de la récupération de l\'utilisateur connecté :', err);
        alert('Impossible de récupérer les informations de l\'utilisateur connecté.');
      }
    });
  }

  // Charger les documents de l'utilisateur
  loadDocuments() {
    const utilisateurId = localStorage.getItem('utilisateurId');
    if (!utilisateurId) {
      alert('Impossible de charger les documents : utilisateur non connecté.');
      return;
    }

    this.http.get<Document[]>(`http://localhost:8080/api/documents/utilisateur/${utilisateurId}`).subscribe({
      next: (response) => {
        this.documents = response || [];
        this.updateRequiredDocumentsStatus();
      },
      error: (err) => {
        console.error('Erreur lors du chargement des documents :', err);
        alert('Une erreur est survenue lors du chargement des documents.');
      }
    });
  }

 // Mettre à jour le statut des documents obligatoires
 updateRequiredDocumentsStatus() {
  this.requiredDocuments.forEach((doc) => {
    const document = this.documents.find((d) => d.typeDocument === doc.type);
    doc.uploaded = !!(document && document.status === 'validé'); // Convertit en boolean avec !!
  });
}

  // Vérifier si un document est refusé
  isDocumentRefused(type: string): boolean {
    const document = this.documents.find((doc) => doc.typeDocument === type);
    return document?.status === 'refusé';
  }

  // Valider un fichier
  isValidFile(file: File): boolean {
    const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf'];
    const maxSize = 5 * 1024 * 1024; // 5 Mo
    return allowedTypes.includes(file.type) && file.size <= maxSize;
  }

  // Téléverser un document
  onUploadDocument() {
    if (!this.selectedFile) {
      alert('Veuillez sélectionner un fichier.');
      return;
    }

    if (!this.isValidFile(this.selectedFile)) {
      alert('Type ou taille de fichier invalide. Veuillez téléverser un fichier PNG, JPEG ou PDF de moins de 5 Mo.');
      return;
    }

    const utilisateurId = localStorage.getItem('utilisateurId');
    if (!utilisateurId) {
      alert('Impossible de téléverser le document : utilisateur non connecté.');
      return;
    }

    const formData = new FormData();
    formData.append('typeDocument', this.documentType);
    formData.append('file', this.selectedFile);
    formData.append('utilisateurId', utilisateurId);

    this.http.post('http://localhost:8080/api/documents', formData).subscribe({
      next: () => {
        alert('Document téléversé avec succès.');
        this.loadDocuments();
      },
      error: (err) => {
        console.error('Erreur lors du téléversement du document :', err);
        alert('Une erreur est survenue lors du téléversement.');
      }
    });
  }

  // Gérer la sélection d'un fichier
  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  // Modifier un document
  onEditDocument(document: any) {
    if (document.status === 'validé') {
      alert('Ce document est validé et ne peut plus être modifié.');
      return;
    }
  
    // Réactiver le document dans le menu déroulant pour permettre la modification
    const docToReactivate = this.requiredDocuments.find((doc) => doc.type === document.typeDocument);
    if (docToReactivate) {
      docToReactivate.uploaded = false; // Réactiver le document dans le menu déroulant
    }
  
    alert(`Vous pouvez maintenant modifier ou téléverser à nouveau le document : ${document.nomDocument}`);
  }

// Supprimer un document
onDeleteDocument(document: Document) {
  if (document.status === 'validé') {
    alert('Ce document est validé et ne peut plus être supprimé.');
    return;
  }
  if (confirm(`Êtes-vous sûr de vouloir supprimer le document : ${document.nomDocument} ?`)) {
    this.http.delete(`http://localhost:8080/api/documents/${document.id}`).subscribe({
      next: () => {
        alert('Document supprimé avec succès.');
        this.loadDocuments();
      },
      error: (err) => {
        console.error('Erreur lors de la suppression du document :', err);
        alert('Une erreur est survenue lors de la suppression du document.');
      }
    });
  }
}

  // Obtenir la classe CSS en fonction du statut
  getStatusClass(status: string): string {
    switch (status) {
      case 'validé':
        return 'status-validé';
      case 'en attente':
        return 'status-en-attente';
      case 'refusé':
        return 'status-refusé';
      default:
        return '';
    }
  }

  // Obtenir l'icône en fonction du statut
  getStatusIcon(status: string): string {
    switch (status) {
      case 'validé':
        return 'fas fa-check-circle'; // Icône pour "validé"
      case 'en attente':
        return 'fas fa-clock'; // Icône pour "en attente"
      case 'refusé':
        return 'fas fa-times-circle'; // Icône pour "refusé"
      default:
        return '';
    }
  }

  // Obtenir le texte du statut
  getStatusText(status: string): string {
    switch (status) {
      case 'validé':
        return 'Validé';
      case 'en attente':
        return 'En attente de validation';
      case 'refusé':
        return 'Refusé';
      default:
        return 'Statut inconnu';
    }
  }
}