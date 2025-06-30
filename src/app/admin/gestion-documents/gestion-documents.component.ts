import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule, NgClass, NgFor, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-gestion-documents',
  templateUrl: './gestion-documents.component.html',
  styleUrls: ['./gestion-documents.component.css'],
  standalone: true,
  imports: [CommonModule, NgClass, NgFor, DatePipe, FormsModule],
})
export class GestionDocumentsComponent implements OnInit {
  utilisateurs: any[] = [];
  utilisateursFiltres: any[] = [];
  searchTerm: string = '';
  filtreStatut: string = '';
  documentEnApercu: any = null;

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.loadDocuments();
  }

  loadDocuments() {
    this.http.get<any[]>('http://localhost:8080/api/documents').subscribe({
      next: (documents) => {
        const utilisateursMap = new Map();

        documents.forEach((document) => {
          if (document.utilisateur && document.utilisateur.id) {
            const utilisateurId = document.utilisateur.id;

            if (!utilisateursMap.has(utilisateurId)) {
              utilisateursMap.set(utilisateurId, {
                nom: document.utilisateur.nom,
                prenom: document.utilisateur.prenom,
                email: document.utilisateur.email,
                telephone: document.utilisateur.telephone,
                isOpen: false,
                documents: [],
              });
            }

            utilisateursMap.get(utilisateurId).documents.push(document);
          } else {
            console.warn('Document sans utilisateur associé :', document);
          }
        });

        this.utilisateurs = Array.from(utilisateursMap.values());
        this.utilisateursFiltres = this.utilisateurs;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des documents :', err);
      },
    });
  }

  toggleAccordion(utilisateur: any) {
    utilisateur.isOpen = !utilisateur.isOpen;
  }

  validerDocument(document: any) {
    this.http
      .put(`http://localhost:8080/api/documents/${document.id}/valider`, {})
      .subscribe({
        next: () => {
          this.loadDocuments();
        },
        error: (err) => {
          console.error('Erreur lors de la validation :', err);
        },
      });
  }

  refuserDocument(document: any) {
    this.http
      .put(`http://localhost:8080/api/documents/${document.id}/refuser`, {})
      .subscribe({
        next: () => {
          this.loadDocuments();
        },
        error: (err) => {
          console.error('Erreur lors du refus :', err);
        },
      });
  }

  validerTous(utilisateur: any) {
    const docsAAvalider = utilisateur.documents.filter(
      (d: any) => d.status === 'en_attente'
    );
    docsAAvalider.forEach((d: any) => this.validerDocument(d));
  }

  refuserTous(utilisateur: any) {
    const docsARefuser = utilisateur.documents.filter(
      (d: any) => d.status === 'en_attente'
    );
    docsARefuser.forEach((d: any) => this.refuserDocument(d));
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
      return status;
  }
}


  getGlobalStatusText(documents: any[]): string {
    const status = this.getGlobalStatus(documents);
    switch (status) {
      case 'validé':
        return 'Validé';
      case 'refusé':
        return 'Refusé';
      case 'en_attente':
        return 'En attente';
      default:
        return status;
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


  getGlobalStatus(documents: any[]): string {
    if (documents.every((d) => d.status === 'validé')) return 'validé';
    if (documents.some((d) => d.status === 'refusé')) return 'refusé';
    return 'en_attente';
  }

  getGlobalStatusClass(documents: any[]): string {
    return 'badge ' + this.getGlobalStatus(documents);
  }

  estFinalise(document: any): boolean {
    return document.status === 'validé' || document.status === 'refusé';
  }

  filtrerUtilisateurs() {
    this.utilisateursFiltres = this.utilisateurs.filter((u) => {
      const matchNom = u.nom
        .toLowerCase()
        .includes(this.searchTerm.toLowerCase());
      const matchEmail = u.email
        .toLowerCase()
        .includes(this.searchTerm.toLowerCase());
      const matchStatut = this.filtreStatut
        ? u.documents.some((d: any) => d.status === this.filtreStatut)
        : true;

      return (matchNom || matchEmail) && matchStatut;
    });
  }

  ouvrirApercu(document: any) {
    this.documentEnApercu = document;
  }

  fermerApercu() {
    this.documentEnApercu = null;
  }

  getSafeUrl(chemin: string): SafeResourceUrl {
    chemin = chemin.replace(/^documents\//, '');
    const fullUrl = `http://localhost:8080/uploads/documents/${encodeURIComponent(chemin)}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(fullUrl);
  }

  estImage(nom: string): boolean {
    return /\.(png|jpe?g|gif|bmp|webp)$/i.test(nom);
  }
}
