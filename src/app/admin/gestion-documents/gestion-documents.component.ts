import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule, NgClass, NgFor, DatePipe } from '@angular/common';

@Component({
  selector: 'app-gestion-documents',
  templateUrl: './gestion-documents.component.html',
  styleUrls: ['./gestion-documents.component.css'],
  standalone: true,
  imports: [CommonModule, NgClass, NgFor, DatePipe]
})
export class GestionDocumentsComponent implements OnInit {
  utilisateurs: any[] = []; // Liste des utilisateurs avec leurs documents

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadDocuments(); // Charger les documents au chargement
  }

  // Charger les documents et les regrouper par utilisateur
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
                isOpen: false, // État de l'accordion
                documents: []
              });
            }

            utilisateursMap.get(utilisateurId).documents.push(document);
          } else {
            console.warn('Document sans utilisateur associé :', document);
          }
        });

        this.utilisateurs = Array.from(utilisateursMap.values());
      },
      error: (err) => {
        console.error('Erreur lors du chargement des documents :', err);
      }
    });
  }

  // Basculer l'état de l'accordion
  toggleAccordion(utilisateur: any) {
    utilisateur.isOpen = !utilisateur.isOpen;
  }

  // Valider un document
  validerDocument(document: any) {
    this.http.put(`http://localhost:8080/api/documents/${document.id}/valider`, {}).subscribe({
      next: () => {
        alert('Document validé avec succès.');
        this.loadDocuments();
      },
      error: (err) => {
        console.error('Erreur lors de la validation du document :', err);
        alert('Une erreur est survenue lors de la validation.');
      }
    });
  }

  // Refuser un document
  refuserDocument(document: any) {
    this.http.put(`http://localhost:8080/api/documents/${document.id}/refuser`, {}).subscribe({
      next: () => {
        alert('Document refusé avec succès.');
        this.loadDocuments();
      },
      error: (err) => {
        console.error('Erreur lors du refus du document :', err);
        alert('Une erreur est survenue lors du refus.');
      }
    });
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

  // Obtenir le texte du statut
  getStatusText(status: string): string {
    switch (status) {
      case 'en attente':
        return 'En attente de validation';
      case 'validé':
        return 'Validé';
      case 'refusé':
        return 'Refusé';
      default:
        return status;
    }
  }
  // Obtenir l'icône CSS en fonction du statut
getStatusIcon(status: string): string {
  switch (status) {
    case 'validé':
      return 'fa fa-check-circle'; // Icône pour "validé"
    case 'refusé':
      return 'fa fa-times-circle'; // Icône pour "refusé"
    case 'en attente':
      return 'fa fa-clock'; // Icône pour "en attente"
    default:
      return '';
  }
}
}