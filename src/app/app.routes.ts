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

export const routes: Routes = [
  // Routes publiques
  { path: '', component: AccueilComponent },
  { path: 'inscription', component: InscriptionComponent },
  { path: 'galerie', component: GalerieComponent },
  { path: 'contact', component: ContactComponent },
  { path: 'connexion', component: ConnexionComponent },

  // Route pour la page "Profil" (protégée par AuthGuard)
  { path: 'profil', component: ProfilComponent, canActivate: [AuthGuard] },

  // Routes protégées pour l'admin
  {
    path: 'admin',
    component: AdminLayoutComponent, // Utilise AdminLayout comme conteneur
    canActivate: [AuthGuard],
    children: [
      { path: 'dashboard-admin', component: DashboardAdminComponent },
      { path: 'horaires', component: GestionHorairesComponent },// Route pour la gestion des horaires
      { path: 'professeurs', component: GestionProfesseursComponent }, // Route pour la gestion des professeurs
      { path: 'avis', component: GestionAvisComponent }
    ]
  },

  // Routes protégées pour le membre
  {
    path: 'membre',
    component: MembreLayoutComponent, // Utilise MembreLayout comme conteneur
    canActivate: [AuthGuard],
    children: [
      { path: 'dashboard-membre', component: DashboardMembreComponent }
    ]
  },

  // Redirection par défaut
  { path: '**', redirectTo: '' }
];