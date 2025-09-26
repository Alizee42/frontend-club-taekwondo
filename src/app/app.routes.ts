import { Routes } from '@angular/router';
import { AccueilComponent } from './pages/accueil/accueil.component';
import { InscriptionComponent } from './pages/inscription/inscription.component';
import { GalerieComponent } from './pages/galerie/galerie.component';
import { ContactComponent } from './pages/contact/contact.component';
import { ConnexionComponent } from './pages/connexion/connexion.component';
import { DashboardAdminComponent } from './admin/dashboard-admin/dashboard-admin.component';
import { DashboardMembreComponent } from './membre/dashboard-membre/dashboard-membre.component';
import { ProfilComponent } from './pages/profil/profil.component';
import { AuthGuard } from './guards/auth.guard';
import { GestionHorairesComponent } from './admin/gestion-horaires/gestion-horaires.component';
import { GestionProfesseursComponent } from './admin/gestion-professeurs/gestion-professeurs.component';
import { GestionAvisComponent } from './admin/gestion-avis/gestion-avis.component';
import { GestionActualitesComponent } from './admin/gestion-actualites/gestion-actualites.component';
import { GestionGalerieComponent } from './admin/gestion-galerie/gestion-galerie.component';
import { DocumentsComponent } from './membre/documents/documents.component';
import { GestionDocumentsComponent } from './admin/gestion-documents/gestion-documents.component';
import { PaiementComponent } from './membre/paiement/paiement.component';
import { GestionPaiementsComponent } from './admin/gestion-paiements/gestion-paiements.component';
import { BoutiqueComponent } from './pages/boutique/boutique.component';
import { GestionCommandeComponent } from './admin/gestion-commande/gestion-commande.component';
import { EvenementsComponent } from './pages/evenements/evenements.component';
import { GestionEvenementsComponent } from './admin/gestion-evenements/gestion-evenements.component';
import { GestionInscriptionsComponent } from './admin/gestion-inscriptions/gestion-inscriptions.component';
import { DashboardParentComponent } from './parent/dashboard-parent/dashboard-parent.component';
import { ConnectedLayoutComponent } from './shared/layouts/connected-layout/connected-layout.component';
import { PaiementParentComponent } from './parent/paiement-parent/paiement-parent.component';
import { DocumentsParentComponent } from './parent/documents-parent/documents-parent.component';
import { CommandesMembreComponent } from './membre/commandes-membre/commandes-membre.component';
import { CommandesParentComponent } from './parent/commandes-parent/commandes-parent.component';
import { EvenementsMembre } from './membre/evenements-membre/evenements-membre.component';
import { EvenementsParent } from './parent/evenements-parent/evenements-parent.component';


export const routes: Routes = [
  // 🌐 Routes publiques
  { path: '', component: AccueilComponent },
  { path: 'inscription', component: InscriptionComponent },
  { path: 'galerie', component: GalerieComponent },
  { path: 'contact', component: ContactComponent },
  { path: 'connexion', component: ConnexionComponent },
  { path: 'boutique', component: BoutiqueComponent },
  { path: 'evenements', component: EvenementsComponent },

  // 👤 Profil (tout utilisateur connecté)
  {
    path: 'profil',
    component: ProfilComponent,
    canActivate: [AuthGuard]
  },

  // 🔐 Espace Admin
  {
    path: 'admin',
    component: ConnectedLayoutComponent,
    canActivateChild: [AuthGuard],
    data: { role: 'ADMIN' },
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
      { path: 'gestion-inscription', component: GestionInscriptionsComponent }
    ]
  },

  // 👤 Espace Membre
  {
    path: 'membre',
    component: ConnectedLayoutComponent,
    canActivateChild: [AuthGuard],
    data: { role: 'MEMBRE' },
    children: [
      { path: 'dashboard-membre', component: DashboardMembreComponent },
      { path: 'documents', component: DocumentsComponent },
      { path: 'paiements', component: PaiementComponent },
      { path: 'commandes', component: CommandesMembreComponent },
      { path: 'evenements', component: EvenementsMembre }
    ]
  },

  // 👤 Espace Parent
  {
    path: 'parent',
    component: ConnectedLayoutComponent,
    canActivateChild: [AuthGuard],
    data: { role: 'PARENT' },
    children: [
      { path: 'dashboard-parent', component: DashboardParentComponent },
      { path: 'paiements', component: PaiementParentComponent },
      { path: 'documents', component: DocumentsParentComponent },
      { path: 'commandes', component: CommandesParentComponent },
      { path: 'evenements', component: EvenementsParent }
    ]
  },

  // 🧭 Redirection inconnue
  { path: '**', redirectTo: '' }
];
