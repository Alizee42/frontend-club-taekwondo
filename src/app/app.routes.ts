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
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  // Routes publiques
  { path: '', component: AccueilComponent },
  { path: 'inscription', component: InscriptionComponent },
  { path: 'galerie', component: GalerieComponent },
  { path: 'contact', component: ContactComponent },
  { path: 'connexion', component: ConnexionComponent },

  // Routes protégées pour l'admin
  {
    path: 'admin',
    component: AdminLayoutComponent, // Utilise AdminLayout comme conteneur
    canActivate: [AuthGuard],
    children: [
      { path: 'dashboard-admin', component: DashboardAdminComponent }
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