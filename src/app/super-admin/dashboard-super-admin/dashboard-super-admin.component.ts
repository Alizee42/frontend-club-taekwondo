import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ClubService, Club } from '../../services/club.service';
import { PaiementService, Paiement } from '../../services/paiement.service';
import { ActualiteService } from '../../services/actualite.service';
import { AvisService, Avis } from '../../services/avis.service';
import { EnseignantService } from '../../services/enseignant.service';
import { GalerieService } from '../../services/galerie.service';
import { UtilisateurService } from '../../services/utilisateur.service';
import { HorairesService } from '../../services/horaires.service';
import { CommandeService } from '../../services/commande.service';
import { EvenementService } from '../../services/evenement.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardNavCardComponent } from '../../dashboard/shared/dashboard-nav-card/dashboard-nav-card.component';
import { KpiCardComponent } from '../../shared/ui/kpi-card/kpi-card.component';
import { KpiGridComponent } from '../../shared/ui/kpi-grid/kpi-grid.component';
@Component({
  selector: 'app-dashboard-super-admin',
  templateUrl: './dashboard-super-admin.component.html',
  styleUrls: ['./dashboard-super-admin.component.css'],
  imports: [CommonModule, FormsModule, DashboardNavCardComponent, KpiCardComponent, KpiGridComponent]
})
export class DashboardSuperAdminComponent implements OnInit {
  // Champs du formulaire club pour <ui-form>
  clubFormFields = [
    { name: 'nom', label: 'Nom du club', type: 'text', required: true, placeholder: 'Nom du club' },
    { name: 'ville', label: 'Ville', type: 'text', required: true, placeholder: 'Ville' },
    { name: 'email', label: 'Email', type: 'text', required: true, placeholder: 'Email' }
  ];
  // Pour la modale et le formulaire club
  openClubModal = false;
  selectedClub: Club | null = null;
  clubColumns = [
    { key: 'nom', label: 'Nom' },
    { key: 'ville', label: 'Ville' },
    { key: 'email', label: 'Email' }
  ];
  clubActions = [
    { label: 'Éditer', icon: 'ri-edit-line', action: 'edit', color: '#2563eb' },
    { label: 'Supprimer', icon: 'ri-delete-bin-line', action: 'delete', color: '#e53935' }
  ];

  handleClubAction(event: { action: string; row: Club }) {
    if (event.action === 'edit') {
      this.selectedClub = event.row;
      this.openClubModal = true;
    } else if (event.action === 'delete') {
      this.supprimerClub(event.row.id);
    }
  }

  onClubFormSubmit(club: Club) {
    // Ajout ou édition selon selectedClub
    if (this.selectedClub) {
      // Edition
      this.clubService.editClub(club).subscribe(() => {
        this.openClubModal = false;
        this.selectedClub = null;
        this.refreshClubs();
      });
    } else {
      // Création
      this.clubService.createClub(club).subscribe(() => {
        this.openClubModal = false;
        this.refreshClubs();
      });
    }
  }

  refreshClubs() {
    this.clubService.getClubs().subscribe((clubs: Club[]) => {
      this.clubs = clubs;
      this.clubsCount = clubs.length;
    });
  }

  // Fermer la modale
  closeClubModal() {
    this.openClubModal = false;
    this.selectedClub = null;
  }
  navigateToGalerie() {
    this.router.navigate(['super-admin/galerie']);
  }

  navigateToHoraires() {
    this.router.navigate(['super-admin/gestion-horaires']);
  }

  today = new Date();

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
  enseignantsCount = 0;
  galeriesCount = 0;
  horairesCount = 0;
  commandesCount = 0;
  evenementsActifsCount = 0;
  produitsCount = 0;
  utilisateursActifs = 0;

  // Liste des clubs
  clubs: Club[] = [];

  // Liste des admins
  admins: Array<{ id: number; nom: string; club: string; email: string }> = [];

  // Actions rapides
  creerClub() { alert('Créer un club (fonction à implémenter)'); }
  supprimerClub(id: number) { alert('Supprimer club ' + id + ' (fonction à implémenter)'); }
  creerAdmin() { alert('Créer un admin (fonction à implémenter)'); }
  supprimerAdmin(id: number) { alert('Supprimer admin ' + id + ' (fonction à implémenter)'); }
  reinitialiserAdmin(id: number) { alert('Réinitialiser mot de passe admin ' + id + ' (fonction à implémenter)'); }

  constructor(
    private clubService: ClubService,
    private router: Router,
    private paiementService: PaiementService,
    private actualiteService: ActualiteService,
    private avisService: AvisService,
    private enseignantService: EnseignantService,
    private galerieService: GalerieService,
    private utilisateurService: UtilisateurService,
    private horairesService: HorairesService,
    private commandeService: CommandeService,
    private evenementService: EvenementService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    // Clubs
    this.clubService.getClubs().subscribe((clubs: Club[]) => {
      this.clubs = clubs;
      this.clubsCount = clubs.length;

      // Agréger tous les paiements de tous les clubs
      let paiementsTotal = 0;
      let paiementsAttente = 0;
      let clubsPaiementsLoaded = 0;
      if (clubs.length === 0) {
        this.paiementsTotal = 0;
        this.paiementsAttente = 0;
      }
      clubs.forEach(club => {
        this.paiementService.getPaiementsByClub(club.id).subscribe((paiements: Paiement[]) => {
          paiementsTotal += paiements
            .filter((p: Paiement) => p.statut === 'VALIDE')
            .reduce((acc: number, p: Paiement) => acc + (p.montantTotal || 0), 0);
          paiementsAttente += paiements
            .filter((p: Paiement) => p.statut === 'EN_ATTENTE')
            .reduce((acc: number, p: Paiement) => acc + (p.montantTotal || 0), 0);
          clubsPaiementsLoaded++;
          if (clubsPaiementsLoaded === clubs.length) {
            this.paiementsTotal = paiementsTotal;
            this.paiementsAttente = paiementsAttente;
          }
        });
      });

      // Enseignants : agrégation par club (pas d'endpoint global)
      let enseignantsTotal = 0;
      let clubsEnseignantsLoaded = 0;
      if (clubs.length === 0) {
        this.enseignantsCount = 0;
      }
      clubs.forEach(club => {
        this.enseignantService.getByClub(club.id).subscribe({
          next: (enseignants) => {
            enseignantsTotal += enseignants.length;
            clubsEnseignantsLoaded++;
            if (clubsEnseignantsLoaded === clubs.length) {
              this.enseignantsCount = enseignantsTotal;
            }
          },
          error: () => {
            clubsEnseignantsLoaded++;
            if (clubsEnseignantsLoaded === clubs.length) {
              this.enseignantsCount = enseignantsTotal;
            }
          }
        });
      });
    });

    // Membres (à adapter pour global)
    // Remplacer par un endpoint global si disponible
    // Exemple : this.membreService.getAllMembres().subscribe(membres => { this.membresCount = membres.length; });

    // Admins (à adapter selon structure)
    // Exemple : this.adminService.getAllAdmins().subscribe(admins => { this.adminsCount = admins.length; });

    // Paiements total

    // Actualités
    this.actualiteService.getAll().subscribe((actualites: any[]) => {
      this.actualitesCount = actualites.length;
    });

    // Avis
    this.avisService.getAvis().subscribe((avis: Avis[]) => {
      this.avisCount = avis.length;
    });

    // Galerie / Médias
    this.galerieService.getAll().subscribe((galeries) => {
      this.galeriesCount = galeries.length;
    });

    // Utilisateurs (tous rôles, tous clubs)
    this.utilisateurService.getAll().subscribe((utilisateurs: any[]) => {
      this.utilisateursActifs = utilisateurs.length;
    });

    // Documents (endpoint global, pas de service dédié)
    this.http.get<any[]>(`${environment.apiUrl}/documents/all`).subscribe({
      next: (documents) => { this.documentsCount = documents.length; },
      error: () => { this.documentsCount = 0; }
    });

    // Horaires (tous clubs)
    this.horairesService.getAllHoraires().subscribe((horaires) => {
      this.horairesCount = horaires.length;
    });

    // Commandes (tous clubs)
    this.commandeService.getCommandes().subscribe((commandes) => {
      this.commandesCount = commandes.length;
    });

    // Événements actifs (tous clubs)
    this.evenementService.getEvenementsActifs().subscribe((evenements) => {
      this.evenementsActifsCount = evenements.length;
      this.evenementsAVenir = evenements.length;
    });

    // Produits (endpoint global, pas de méthode dédiée dans ProduitService)
    this.http.get<any[]>(`${environment.apiUrl}/produits`).subscribe({
      next: (produits) => { this.produitsCount = produits.length; },
      error: () => { this.produitsCount = 0; }
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
    this.router.navigate(['super-admin/gestion-paiements']);
  }
  navigateToCommandes() {
    this.router.navigate(['super-admin/commandes']);
  }
  navigateToProduits() {
    this.router.navigate(['super-admin/gestion-produits']);
  }
  navigateToActualites() {
    this.router.navigate(['super-admin/actualites']);
  }
  navigateToDocuments() {
    this.router.navigate(['super-admin/documents']);
  }
  // navigateToDocumentsRequis supprimé (demande: retirer du dashboard)
  navigateToAvis() {
    this.router.navigate(['super-admin/avis']);
  }
  navigateToUtilisateurs() {
    this.router.navigate(['super-admin/utilisateurs']);
  }
  navigateToEvenements() {
    this.router.navigate(['super-admin/evenements']);
  }
  navigateToEnseignants() {
    this.router.navigate(['super-admin/enseignants']);
  }

  navigateToAccueilSite() {
    this.router.navigate(['super-admin/accueil-site']);
  }

  navigateToHero() {
    this.router.navigate(['super-admin/hero']);
  }

  navigateToAPropos() {
    this.router.navigate(['super-admin/apropos']);
  }
}
