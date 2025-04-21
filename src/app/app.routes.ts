import { Routes } from '@angular/router';
import { AccueilComponent } from './pages/home/accueil/accueil.component';
import { InfosComponent } from './pages/infos/infos.component';
import { InscriptionComponent } from './pages/infos/inscription/inscription.component';
import { TarifComponent } from './pages/infos/tarif/tarif.component';

export const routes: Routes = [
  { path: '', component: AccueilComponent }, 
  {
    path: 'infos',
    component: InfosComponent,
    children: [
      { path: 'inscription', component: InscriptionComponent },
      { path: 'tarif', component: TarifComponent }
    ]
  },
  { path: '**', redirectTo: '' } 
];