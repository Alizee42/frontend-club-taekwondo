import { Routes } from '@angular/router';
import { AccueilComponent } from './pages/home/accueil/accueil.component';

export const routes: Routes = [
  { path: '', component: AccueilComponent }, // Route par défaut pour la page d'accueil
  { path: '**', redirectTo: '' } // Redirection pour les routes non trouvées
];