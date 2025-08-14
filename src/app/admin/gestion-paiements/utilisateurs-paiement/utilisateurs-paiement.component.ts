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

  // Modales
  modalStatsVisible: boolean = false;
  modalEcheancesVisible: boolean = false;
  utilisateurSelectionne: any = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.chargerPaiements();
  }

  chargerPaiements(): void {
    this.http.get<any[]>('http://localhost:8080/api/paiements').subscribe(data => {
      const paiements = data || [];

      const utilisateursMap = new Map<number, any>();

      paiements.forEach(p => {
        // On prend l'ID du parent (utilisateur payeur)
        const idParent = p.utilisateurId;

        if (!utilisateursMap.has(idParent)) {
          utilisateursMap.set(idParent, {
            id: idParent,
            nom: p.utilisateurNom,
            prenom: p.utilisateurPrenom,
            email: p.utilisateurEmail || '—',
            paiements: []
          });
        }

        // On garde le statut exact tel que renvoyé par le backend
        utilisateursMap.get(idParent).paiements.push({
          ...p,
          statut: p.statut ? p.statut.toLowerCase() : 'inconnu'
        });
      });

      // Conversion en tableau
      let listeUtilisateurs = Array.from(utilisateursMap.values());

      // ✅ On ne garde que ceux qui ont au moins un paiement "payé"
      listeUtilisateurs = listeUtilisateurs.filter(u =>
        u.paiements.some((pay: any) => pay.statut === 'payé')
      );

      this.utilisateurs = listeUtilisateurs;
      this.utilisateursFiltres = [...this.utilisateurs];

      console.log('✅ Utilisateurs avec au moins un paiement payé :', this.utilisateurs);
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

    // Si tous payés → à jour
    if (utilisateur.paiements.every((p: any) => p.statut === 'payé')) {
      return 'payé';
    }
    // S'il y a au moins un en retard
    if (utilisateur.paiements.some((p: any) => p.statut === 'en retard')) {
      return 'en retard';
    }
    // S'il y a au moins un en attente
    if (utilisateur.paiements.some((p: any) => p.statut === 'en attente')) {
      return 'en attente';
    }
    // S'il y a au moins un annulé
    if (utilisateur.paiements.some((p: any) => p.statut === 'annulé')) {
      return 'annulé';
    }

    return 'inconnu';
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
