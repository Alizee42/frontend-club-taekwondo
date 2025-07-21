import { Routes } from '@angular/router';
import { AccueilComponent } from './pages/accueil/accueil.component';
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
import { GestionGalerieComponent } from './admin/gestion-galerie/gestion-galerie.component';
import { DocumentsComponent } from './membre/documents/documents.component';
import { GestionDocumentsComponent } from './admin/gestion-documents/gestion-documents.component';
import { PaiementComponent } from './membre/paiement/paiement.component'; 
import { GestionPaiementsComponent } from './admin/gestion-paiements/gestion-paiements.component'; // Importer le composant Paiement
import { BoutiqueComponent } from './pages/boutique/boutique.component';
import { GestionCommandeComponent } from './admin/gestion-commande/gestion-commande.component';
import { EvenementsComponent } from './pages/evenements/evenements.component';
import { GestionEvenementsComponent } from './admin/gestion-evenements/gestion-evenements.component';
import { GestionInscriptionsComponent } from './admin/gestion-inscriptions/gestion-inscriptions.component';

export const routes: Routes = [
  // 🌐 Routes publiques
  { path: '', component: AccueilComponent },
  { path: 'inscription', component: InscriptionComponent },
  { path: 'galerie', component: GalerieComponent },
  { path: 'contact', component: ContactComponent },
  { path: 'connexion', component: ConnexionComponent },
  { path: 'boutique', component: BoutiqueComponent },
  { path: 'evenements', component: EvenementsComponent },

  // 👤 Profil connecté (protégé)
  { path: 'profil', component: ProfilComponent, canActivate: [AuthGuard] },

  // 🔐 Espace Admin
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: 'dashboard-admin', component: DashboardAdminComponent },
      { path: 'horaires', component: GestionHorairesComponent },
      { path: 'professeurs', component: GestionProfesseursComponent },
      { path: 'avis', component: GestionAvisComponent },
      { path: 'actualites', component: GestionActualitesComponent },
      { path: 'galerie', component: GestionGalerieComponent },
      { path: 'documents', component: GestionDocumentsComponent },
      { path: 'paiements', component: GestionPaiementsComponent },
      { path: 'gestion-commande', component: GestionCommandeComponent },
      { path: 'gestion-evenement', component: GestionEvenementsComponent },
      { path: 'gestion-inscription', component: GestionInscriptionsComponent}
    ]
  },

  // 👤 Espace Membre
  {
    path: 'membre',
    component: MembreLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: 'dashboard-membre', component: DashboardMembreComponent },
      { path: 'documents', component: DocumentsComponent },
      { path: 'paiements', component: PaiementComponent }
    ]
  },

  // 🧭 Redirection par défaut
  { path: '**', redirectTo: '' }
];
