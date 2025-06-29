import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-utilisateurs-paiement',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './utilisateurs-paiement.component.html',
  styleUrls: ['./utilisateurs-paiement.component.css']
})
export class UtilisateursPaiementComponent implements OnInit {
  utilisateurs: any[] = [];
  utilisateursFiltres: any[] = [];
  searchTerm: string = '';
  paiements: any[] = [];
  paiementsFiltres: any[] = [];

  // Modales
  modalStatsVisible: boolean = false;
  modalEcheancesVisible: boolean = false;
  utilisateurSelectionne: any = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.chargerPaiements();
  }

  chargerPaiements(): void {
    this.http.get<any[]>('/api/paiements').subscribe(data => {
      const paiements = data;
  
      const utilisateursMap = new Map<number, any>();
  
      paiements.forEach(p => {
        const id = p.utilisateurId;
        if (!utilisateursMap.has(id)) {
          utilisateursMap.set(id, {
            id: id,
            nom: p.utilisateurNom,
            prenom: p.utilisateurPrenom,
            email: p.utilisateurEmail || '—',
            paiements: []
          });
        }        
        utilisateursMap.get(id).paiements.push(p);
      });
  
      this.utilisateurs = Array.from(utilisateursMap.values());
      this.utilisateursFiltres = [...this.utilisateurs];
  
      console.log('Utilisateurs regroupés avec paiements :', this.utilisateurs);
    });
  }
  

  filtrerUtilisateurs(): void {
    const terme = this.searchTerm.toLowerCase();
    this.utilisateursFiltres = this.utilisateurs.filter(u =>
      `${u.nom} ${u.prenom}`.toLowerCase().includes(terme)
    );
  }

  getStatutPaiement(utilisateur: any): string {
    if (!utilisateur.paiements || utilisateur.paiements.length === 0) {
      return 'inconnu';
    }
  
    let hasEnRetard = false;
    let hasEnAttente = false;
    let hasAnnule = false;
  
    for (const p of utilisateur.paiements) {
      const statut = p.statut?.toLowerCase();
      if (statut === 'en retard') {
        hasEnRetard = true;
      } else if (statut === 'en attente') {
        hasEnAttente = true;
      } else if (statut === 'annulé') {
        hasAnnule = true;
      } else if (statut === 'payé') {
        // continue
      }
    }
  
    if (hasEnRetard) return 'en retard';
    if (hasEnAttente) return 'en attente';
    if (hasAnnule) return 'annulé'; // ✅ Ajouté
  
    return 'à jour';
  }
  
  

  voirStats(utilisateur: any): void {
    this.utilisateurSelectionne = utilisateur;
    this.modalStatsVisible = true;
  }

  voirEcheances(utilisateur: any): void {
    this.utilisateurSelectionne = utilisateur;
    this.modalEcheancesVisible = true;
  }

  fermerModale(): void {
    this.modalStatsVisible = false;
    this.modalEcheancesVisible = false;
    this.utilisateurSelectionne = null;
  }
}