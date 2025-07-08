import { Routes } from '@angular/router';
import { AccueilComponent } from './pages/home/accueil/accueil.component';
import { InscriptionComponent } from './pages/inscription/inscription.component';
import { GalerieComponent } from './pages/galerie/galerie.component';
import { ContactComponent } from './pages/contact/contact.component';
import { ConnexionComponent } from './pages/connexion/connexion.component';
import { DashboardAdminComponent } from './admin/dashboard-admin/dashboard-admin.component';
import { DashboardMembreComponent } from './membre/dashboard-membre/dashboard-membre.component';
import { AdminLayoutComponent } from './admin/layout/admin-layout/admin-layout.component';
import { MembreLayoutComponent } from './membre/layout/membre-layout/membre-layout.component';
import { ProfilComponent } from './pages/profil/profil.component'; // Importer le composant Profil
import { AuthGuard } from './guards/auth.guard';
import { GestionHorairesComponent } from './admin/gestion-horaires/gestion-horaires.component';
import { GestionProfesseursComponent } from './admin/gestion-professeurs/gestion-professeurs.component';
import { GestionAvisComponent } from './admin/gestion-avis/gestion-avis.component';
import { GestionActualitesComponent } from './admin/gestion-actualites/gestion-actualites.component';
import { ActualiteDetailComponent } from './pages/home/actualites/actualite-detail/actualite-detail.component';
import { GestionGalerieComponent } from './admin/gestion-galerie/gestion-galerie.component';
import { DocumentsComponent } from './membre/documents/documents.component';
import { GestionDocumentsComponent } from './admin/gestion-documents/gestion-documents.component';
import { PaiementComponent } from './membre/paiement/paiement.component'; 
import { GestionPaiementsComponent } from './admin/gestion-paiements/gestion-paiements.component'; // Importer le composant Paiement
import { BoutiqueComponent } from './pages/boutique/boutique.component';
import { GestionCommandeComponent } from './admin/gestion-commande/gestion-commande.component';

export const routes: Routes = [
  // Routes publiques
  { path: '', component: AccueilComponent },
  { path: 'inscription', component: InscriptionComponent },
  { path: 'galerie', component: GalerieComponent },
  { path: 'contact', component: ContactComponent },
  { path: 'connexion', component: ConnexionComponent },

  { path: 'actualite/:id', component: ActualiteDetailComponent },

  // Route pour la page "Profil" (protégée par AuthGuard)
  { path: 'profil', component: ProfilComponent, canActivate: [AuthGuard] },
  { path: 'boutique', component: BoutiqueComponent },


  // Routes protégées pour l'admin
  {
    path: 'admin',
    component: AdminLayoutComponent, // Utilise AdminLayout comme conteneur
    canActivate: [AuthGuard],
    children: [
      { path: 'dashboard-admin', component: DashboardAdminComponent },
      { path: 'horaires', component: GestionHorairesComponent },// Route pour la gestion des horaires
      { path: 'professeurs', component: GestionProfesseursComponent }, // Route pour la gestion des professeurs
      { path: 'avis', component: GestionAvisComponent },
      { path: 'actualites', component: GestionActualitesComponent },
      { path: 'galerie', component: GestionGalerieComponent },
      { path: 'documents', component: GestionDocumentsComponent }, // Route pour la gestion des documents
      { path: 'paiements', component: GestionPaiementsComponent },
      { path: 'gestion-commande', component: GestionCommandeComponent } // Nouvelle route

    ]
  },

  // Routes protégées pour le membre
  {
    path: 'membre',
    component: MembreLayoutComponent, // Utilise MembreLayout comme conteneur
    canActivate: [AuthGuard],
    children: [
      { path: 'dashboard-membre', component: DashboardMembreComponent },
      { path: 'documents', component: DocumentsComponent }, // Route pour les documents
      { path: 'paiements', component: PaiementComponent }, // Nouvelle route pour les paiements
    ]
  },

  // Redirection par défaut
  { path: '**', redirectTo: '' }
];