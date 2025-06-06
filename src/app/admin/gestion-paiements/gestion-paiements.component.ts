import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Interface pour définir le type des paiements
interface Utilisateur {
  nom: string;
  email?: string; // Propriété optionnelle
  telephone?: string; // Propriété optionnelle
}

interface Paiement {
  id: number;
  utilisateur: Utilisateur; // Utilisateur avec les propriétés nécessaires
  montant: number;
  montantTotal: number;
  montantRestant: number;
  datePaiement: string;
  statut: string;
  modePaiement: string;
}

@Component({
  selector: 'app-gestion-paiements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-paiements.component.html',
  styleUrls: ['./gestion-paiements.component.css']
})
export class GestionPaiementsComponent implements OnInit {
  paiements: Paiement[] = []; // Liste des paiements
  utilisateursRegroupes: any[] = []; // Stocke les utilisateurs regroupés

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadPaiements();
  }

  // Charger tous les paiements
  loadPaiements(): void {
    const token = localStorage.getItem('token');
    this.http.get<Paiement[]>('http://localhost:8080/api/paiements', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (data: Paiement[]) => {
        this.paiements = data;
        this.utilisateursRegroupes = this.regrouperPaiementsParUtilisateur(); // Regrouper les paiements après le chargement
      },
      error: (err) => {
        console.error('Erreur lors du chargement des paiements :', err);
      }
    });
  }

  // Regrouper les paiements par utilisateur
  regrouperPaiementsParUtilisateur(): any[] {
    const utilisateursMap = new Map();

    this.paiements.forEach((paiement) => {
      const utilisateur = paiement.utilisateur;
      if (!utilisateursMap.has(utilisateur.nom)) {
        utilisateursMap.set(utilisateur.nom, {
          nom: utilisateur.nom,
          email: utilisateur.email || 'Non renseigné',
          telephone: utilisateur.telephone || 'Non renseigné',
          paiements: []
        });
      }
      utilisateursMap.get(utilisateur.nom).paiements.push(paiement);
    });

    return Array.from(utilisateursMap.values());
  }

  // Basculer l'affichage des détails
  toggleDetails(index: number): void {
    if (this.utilisateursRegroupes[index]) {
      this.utilisateursRegroupes[index].showDetails = !this.utilisateursRegroupes[index].showDetails;
    }
  }

  // Valider un paiement
  validerPaiement(id: number): void {
    const token = localStorage.getItem('token');
    this.http.post(`http://localhost:8080/api/paiements/${id}/valider`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: () => {
        alert('Paiement validé avec succès.');
        this.loadPaiements();
      },
      error: (err) => {
        console.error('Erreur lors de la validation du paiement :', err);
      }
    });
  }

  // Annuler un paiement
  annulerPaiement(id: number): void {
    const token = localStorage.getItem('token');
    this.http.post(`http://localhost:8080/api/paiements/${id}/annuler`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: () => {
        alert('Paiement annulé avec succès.');
        this.loadPaiements();
      },
      error: (err) => {
        console.error('Erreur lors de l\'annulation du paiement :', err);
      }
    });
  }
  filtreStatut: string = '';
filtreUtilisateur: string = '';
filtreModePaiement: string = '';

appliquerFiltres(): void {
  const params = {
    statut: this.filtreStatut,
    utilisateur: this.filtreUtilisateur,
    modePaiement: this.filtreModePaiement
  };

  this.http.get<Paiement[]>('http://localhost:8080/api/paiements/admin', { params }).subscribe({
    next: (data) => {
      this.paiements = data;
    },
    error: (err) => {
      console.error('Erreur lors de l\'application des filtres :', err);
    }
  });
}
}