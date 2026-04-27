import { GestionHorairesSuperAdminComponent } from './super-admin/gestion-horaires/gestion-horaires-super-admin.component';
import { UtilisateursSuperAdminComponent } from './super-admin/utilisateurs/utilisateurs-super-admin.component';
import { GestionUtilisateursComponent } from './admin/gestion-utilisateurs/gestion-utilisateurs.component';
import { Routes } from '@angular/router';
import { ActualiteDetailComponent } from './pages/actualite-detail/actualite-detail.component';
import { AccueilComponent } from './pages/accueil/accueil.component';
import { ClubSelectComponent } from './club-select/club-select.component';
import { InscriptionComponent } from './pages/inscription/inscription.component';
import { GalerieComponent } from './pages/galerie/galerie.component';
import { ContactComponent } from './pages/contact/contact.component';
import { ConnexionComponent } from './pages/connexion/connexion.component';
import { DashboardAdminComponent } from './admin/dashboard-admin/dashboard-admin.component';
import { DashboardSuperAdminComponent } from './super-admin/dashboard-super-admin/dashboard-super-admin.component';
import { ClubsComponent } from './super-admin/clubs/clubs.component';
import { AdminsComponent } from './super-admin/admins/admins.component';
import { MembresSuperAdminComponent } from './super-admin/membres-super-admin/membres-super-admin.component';
import { LogsComponent } from './super-admin/logs/logs.component';
import { ActualitesSuperAdminComponent } from './super-admin/actualites/actualites-super-admin.component';
import { DashboardMembreComponent } from './membre/dashboard-membre/dashboard-membre.component';
import { ProfilComponent } from './pages/profil/profil.component';
import { AuthGuard } from './guards/auth.guard';
import { GestionHorairesAdminComponent } from './admin/gestion-horaires/gestion-horaires-admin.component';
import { GestionProfesseursComponent } from './admin/gestion-professeurs/gestion-professeurs.component';
import { GestionAvisComponent } from './admin/gestion-avis/gestion-avis.component';
import { GestionActualitesComponent } from './admin/gestion-actualites/gestion-actualites.component';
import { GalerieGestionSuperAdminComponent } from './super-admin/galerie-gestion/galerie-gestion.component';
import{ GestionGalerieComponent } from './admin/gestion-galerie/gestion-galerie.component';
import { DocumentsComponent } from './membre/documents/documents.component';
import { GestionDocumentsComponent } from './admin/gestion-documents/gestion-documents.component';
import { PaiementComponent } from './membre/paiement/paiement.component';
import { GestionPaiementsComponent } from './admin/gestion-paiements/gestion-paiements.component';
import { BoutiqueComponent } from './pages/boutique/boutique.component';
import { GestionCommandeComponent } from './admin/gestion-commande/gestion-commande.component';
import { EvenementsComponent } from './pages/evenements/evenements.component';
import { GestionEvenementsComponent } from './admin/gestion-evenements/gestion-evenements.component';
import { DashboardParentComponent } from './parent/dashboard-parent/dashboard-parent.component';
import { PaiementParentComponent } from './parent/paiement-parent/paiement-parent.component';
import { DocumentsParentComponent } from './parent/documents-parent/documents-parent.component';
import { DocumentsSuperAdminComponent } from './super-admin/documents/documents-super-admin.component';
import { CommandesMembreComponent } from './membre/commandes-membre/commandes-membre.component';
import { CommandesParentComponent } from './parent/commandes-parent/commandes-parent.component';
import { EvenementsMembre } from './membre/evenements-membre/evenements-membre.component';
import { EvenementsParent } from './parent/evenements-parent/evenements-parent.component';
import { MotDePasseOublieComponent } from './pages/mot-de-passe-oublie/mot-de-passe-oublie.component';
import { ReinitialiserMotDePasseComponent } from './pages/reinitialiser-mot-de-passe/reinitialiser-mot-de-passe.component';
import { MentionsLegalesComponent } from './pages/mentions-legales/mentions-legales.component';
import { PolitiqueConfidentialiteComponent } from './pages/politique-confidentialite/politique-confidentialite.component';



export const routes: Routes = [
  // 🌐 Routes publiques
  { path: '', component: AccueilComponent },
  { path: 'actualite/:id', component: ActualiteDetailComponent },
  { path: 'club-select', component: ClubSelectComponent },
  { path: 'inscription', component: InscriptionComponent },
  { path: 'galerie', component: GalerieComponent }, // par défaut pour public et membres
  { path: 'contact', component: ContactComponent },
  { path: 'connexion', component: ConnexionComponent },
  { path: 'mot-de-passe-oublie', component: MotDePasseOublieComponent },
  { path: 'reinitialiser-mot-de-passe', component: ReinitialiserMotDePasseComponent },
  { path: 'boutique', component: BoutiqueComponent },
  { path: 'evenements', component: EvenementsComponent },
  { path: 'mentions-legales', component: MentionsLegalesComponent },
  { path: 'politique-confidentialite', component: PolitiqueConfidentialiteComponent },

  // 👤 Profil (tout utilisateur connecté)
  {
    path: 'profil',
    component: ProfilComponent,
    canActivate: [AuthGuard]
  },

  // 🔐 Espace Admin
  {
    path: 'admin',
    canActivateChild: [AuthGuard],
    data: { role: 'ADMIN' },
    children: [
      { path: 'dashboard-admin', component: DashboardAdminComponent },
  { path: 'horaires', component: GestionHorairesAdminComponent },
      { path: 'professeurs', component: GestionProfesseursComponent },
      { path: 'avis', component: GestionAvisComponent },
      { path: 'actualites', component: GestionActualitesComponent },
      { path: 'galerie', component: GestionGalerieComponent },
      { path: 'documents', component: GestionDocumentsComponent },
      { path: 'paiements', component: GestionPaiementsComponent },
      { path: 'gestion-commande', component: GestionCommandeComponent },
      { path: 'gestion-evenement', component: GestionEvenementsComponent },
      { path: 'membres', loadComponent: () => import('./admin/membres-admin/membres-admin.component').then(m => m.MembresAdminComponent) },
      { path: 'gestion-utilisateurs', component: GestionUtilisateursComponent }
    ]
  },

  // 👤 Espace Membre
  {
    path: 'membre',
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

    // 🏆 Espace Super Admin
    {
      path: 'super-admin',
      canActivateChild: [AuthGuard],
      data: { role: 'SUPER_ADMIN' },
    children: [
  { path: 'dashboard-super-admin', component: DashboardSuperAdminComponent },
  { path: 'clubs', component: ClubsComponent },
  { path: 'admins', component: AdminsComponent },
  { path: 'membres', component: MembresSuperAdminComponent },
  { path: 'gestion-paiements', loadComponent: () => import('./super-admin/gestion-paiements-super-admin/gestion-paiements-super-admin.component').then(m => m.GestionPaiementsSuperAdminComponent) },
  { path: 'logs', component: LogsComponent },
  { path: 'actualites', component: ActualitesSuperAdminComponent },
  { path: 'galerie', component: GalerieGestionSuperAdminComponent }, // galerie super admin
  { path: 'galerie-gestion', component: GalerieGestionSuperAdminComponent },
  { path: 'gestion-horaires', component: GestionHorairesSuperAdminComponent },
  { path: 'utilisateurs', component: UtilisateursSuperAdminComponent },
  { path: 'documents', component: DocumentsSuperAdminComponent },
  { path: 'commandes', component: GestionCommandeComponent },
  { path: 'evenements', component: GestionEvenementsComponent },
  { path: 'avis', loadComponent: () => import('./super-admin/avis-super-admin/avis-super-admin.component').then(m => m.AvisSuperAdminComponent) },
  { path: 'enseignants', loadComponent: () => import('./super-admin/enseignants/enseignants-super-admin.component').then(m => m.EnseignantsSuperAdminComponent) },
 
    ]
    },
  // 🧭 Redirection inconnue
  { path: '**', redirectTo: '' }
];
