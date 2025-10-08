import { Component, OnInit, Renderer2 } from '@angular/core';
import { ClubService, Club } from './services/club.service';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { ToastContainerComponent } from './shared/toast/toast-container/toast-container.component'; // <-- AJOUT


import { HeaderComponent } from './layout/header/header.component';
import { ConnectedHeaderComponent } from './components/shared/connected-header/connected-header.component';
import { FooterComponent } from './layout/footer/footer.component';

import { ParametresPaiementService } from './services/parametres-paiement.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    HeaderComponent,
    FooterComponent,
    ToastContainerComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  constructor() {}
}
