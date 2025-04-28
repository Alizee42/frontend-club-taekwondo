import { Routes } from '@angular/router';
import { AccueilComponent } from './pages/home/accueil/accueil.component';
import { InscriptionComponent } from './pages/inscription/inscription.component';
import { GalerieComponent } from './pages/galerie/galerie.component';
import { ContactComponent } from './pages/contact/contact.component';

export const routes: Routes = [
  { path: '', component: AccueilComponent }, 
  { path: 'inscription', component: InscriptionComponent },
  { path: 'galerie', component: GalerieComponent },
  { path: 'contact', component: ContactComponent },
  
  { path: '**', redirectTo: '' } 
];