


import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ClubService, Club } from '../../services/club.service';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard-super-admin',
  templateUrl: './dashboard-super-admin.component.html',
  styleUrls: ['./dashboard-super-admin.component.css'],
  imports: [CommonModule, FormsModule, CurrencyPipe]
})
export class DashboardSuperAdminComponent implements OnInit {
  // KPIs globaux
  clubsCount = 0;
  membresCount = 0;
  adminsCount = 0;
  paiementsTotal = 0;
  paiementsAttente = 0;
  evenementsAVenir = 0;
  documentsCount = 0;
  actualitesCount = 0;
  avisCount = 0;
  utilisateursActifs = 0;
  logsCount = 0;

  // Liste des clubs
  clubs: Club[] = [];

  // Liste des admins
  admins: Array<{ id: number; nom: string; club: string; email: string }> = [];

  // Logs de sécurité
  logs: Array<{ id: number; type: string; date: string; utilisateur: string; details: string }> = [
    { id: 1, type: 'Connexion', date: '2025-10-07', utilisateur: 'admin1', details: 'Connexion réussie' },
    { id: 2, type: 'Suppression', date: '2025-10-06', utilisateur: 'superadmin', details: 'Suppression d’un club' },
    { id: 3, type: 'Modification', date: '2025-10-05', utilisateur: 'admin2', details: 'Changement d’email' }
  ];

  // Actions rapides
  creerClub() { alert('Créer un club (fonction à implémenter)'); }
  supprimerClub(id: number) { alert('Supprimer club ' + id + ' (fonction à implémenter)'); }
  creerAdmin() { alert('Créer un admin (fonction à implémenter)'); }
  supprimerAdmin(id: number) { alert('Supprimer admin ' + id + ' (fonction à implémenter)'); }
  reinitialiserAdmin(id: number) { alert('Réinitialiser mot de passe admin ' + id + ' (fonction à implémenter)'); }

  constructor(private clubService: ClubService, private router: Router) {}

  ngOnInit(): void {
    const token = localStorage.getItem('token');
    this.clubService.getClubs().subscribe(clubs => {
      this.clubs = clubs;
      this.clubsCount = clubs.length;
      // Simule les stats pour la démo visuelle
      this.membresCount = 1200;
      this.adminsCount = 18;
      this.paiementsTotal = 45200;
      this.paiementsAttente = 3200;
      this.evenementsAVenir = 7;
      this.documentsCount = 56;
      this.actualitesCount = 12;
      this.avisCount = 34;
      this.utilisateursActifs = 980;
      this.logsCount = this.logs.length;
    });
  }

  // Méthodes de chargement (à connecter à tes services)
  loadClubs() {}
  loadAdmins() {}
  loadUtilisateurs() {}
  loadActualites() {}
  loadAvis() {}
  loadDocuments() {}
  loadLogs() {}

  // Méthodes de navigation pour chaque section du dashboard
  navigateToClubs() {
    this.router.navigate(['super-admin/clubs']);
  }
  navigateToAdmins() {
    this.router.navigate(['super-admin/admins']);
  }
  navigateToMembres() {
    this.router.navigate(['super-admin/membres']);
  }
  navigateToPaiement() {
    this.router.navigate(['super-admin/paiements']);
  }
  navigateToCommandes() {
    this.router.navigate(['super-admin/commandes']);
  }
  navigateToLogs() {
    this.router.navigate(['super-admin/logs']);
  }
  navigateToActualites() {
    this.router.navigate(['super-admin/actualites']);
  }
  navigateToDocuments() {
    this.router.navigate(['super-admin/documents']);
  }
  navigateToAvis() {
    this.router.navigate(['super-admin/avis']);
  }
  navigateToUtilisateurs() {
    this.router.navigate(['super-admin/utilisateurs']);
  }
  navigateToEvenements() {
    this.router.navigate(['super-admin/evenements']);
  }
}
