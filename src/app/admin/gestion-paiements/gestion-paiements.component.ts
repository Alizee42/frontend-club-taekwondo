import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { Chart, ArcElement, Tooltip, Legend, DoughnutController } from 'chart.js';

import { SuiviPaiementsComponent } from './suivi-paiements/suivi-paiements.component';
import { EcheancesComponent } from './echeances/echeances.component';
import { AjoutPaiementComponent } from './ajout-paiement/ajout-paiement.component';
import { UiTitleComponent } from '../../shared/ui/title/ui-title.component';
import { PaymentAdminService } from '../../services/payment-admin.service';
import { DashboardStats } from '../../models/dashboard-stats.model';
import { DaySum } from '../../models/day-sum';
import { MembreRetard } from '../../models/membre-retard';

Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

@Component({
  selector: 'app-gestion-paiements',
  standalone: true,
  imports: [
    CommonModule,
    SuiviPaiementsComponent,
    EcheancesComponent,
    AjoutPaiementComponent,
    UiTitleComponent
  ],
  templateUrl: './gestion-paiements.component.html',
  styleUrls: ['./gestion-paiements.component.css']
})
export class GestionPaiementsComponent implements OnInit, OnDestroy {
  ongletActif: 'paiements' | 'echeances' = 'paiements';
  modalAjoutVisible = false;
  
  stats: DashboardStats & {
    courbe: DaySum[];
    membresEnRetard: MembreRetard[];
  } = {
    totalPayes: 0,
    totalAnnules: 0,
    totalAttente: 0,
    pourcentagePayesMois: 0,
    courbe: [],
    membresEnRetard: []
  };

  private statsSubscription?: Subscription;

  constructor(private paymentService: PaymentAdminService) {}

  ngOnInit(): void {
    this.statsSubscription = this.paymentService.dashboardStats$.subscribe(data => {
      if (data) {
        this.stats = {
          totalPayes: data.totalPayes || 0,
          totalAnnules: data.totalAnnules || 0,
          totalAttente: data.totalAttente || 0,
          pourcentagePayesMois: data.pourcentagePayesMois || 0,
          courbe: data.courbe || [],
          membresEnRetard: data.membresEnRetard || []
        };
      }
    });

    this.refreshStats();
  }

  refreshStats(): void {
    this.paymentService.refreshDashboardStats().subscribe({
      next: () => console.log('[✔️] Stats paiements actualisées'),
      error: err => {
        console.error('[❌] Erreur refresh stats', err);
        // Garder les valeurs par défaut en cas d'erreur
      }
    });
  }

  changerOnglet(onglet: 'paiements' | 'echeances'): void {
    this.ongletActif = onglet;
  }

  ouvrirModalAjout(): void {
    this.modalAjoutVisible = true;
  }

  fermerModalAjout(): void {
    this.modalAjoutVisible = false;
  }

  onPaiementAjoute(): void {
    this.fermerModalAjout();
    this.refreshStats();
  }

  ngOnDestroy(): void {
    if (this.statsSubscription) {
      this.statsSubscription.unsubscribe();
    }
  }
}
