import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardStats } from '../../../models/dashboard-stats.model';
import { PaymentAdminService } from '../../../services/payment-admin.service';
import {
  Chart,
  ArcElement,
  Tooltip,
  Legend,
  DoughnutController
} from 'chart.js';
import { DaySum } from '../../../models/day-sum';
import { MembreRetard } from '../../../models/membre-retard';
import { Subscription } from 'rxjs';

Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

@Component({
  selector: 'app-dashboard-paiement',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-paiement.component.html',
  styleUrls: ['./dashboard-paiement.component.css']
})
export class DashboardPaiementComponent implements OnInit, OnDestroy {
  stats!: DashboardStats & {
    courbe: DaySum[];
    membresEnRetard: MembreRetard[];
  };

  chart: Chart | null = null;
  private statsSubscription!: Subscription;

  constructor(private paymentService: PaymentAdminService) {}

  ngOnInit(): void {

    // 👂 On s'abonne au flux observable
    this.statsSubscription = this.paymentService.dashboardStats$.subscribe(data => {
      if (!data) return;

      this.stats = {
        totalPayes: data.totalPayes,
        totalAnnules: data.totalAnnules,
        totalAttente: data.totalAttente,
        pourcentagePayesMois: data.pourcentagePayesMois,
        courbe: data.courbe || [],
        membresEnRetard: data.membresEnRetard || []
      };

      this.buildDoughnutChart();
    });

    this.refreshStats();
  }

  /**
   * Recharge les données depuis le backend
   */
  refreshStats(): void {
    this.paymentService.refreshDashboardStats().subscribe({
      next: () => console.log('[✔️] Dashboard actualisé'),
      error: err => console.error('[❌] Erreur lors du refresh', err)
    });
  }

  /**
   * Affiche le donut avec les 3 totaux
   */
  buildDoughnutChart(): void {
    setTimeout(() => {
      const canvas = document.getElementById('doughnutChart') as HTMLCanvasElement;
      if (!canvas) {
        console.warn('[⚠️] Canvas #doughnutChart introuvable');
        return;
      }

      if (this.chart) { this.chart.destroy(); this.chart = null; }

      this.chart = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: ['Payés', 'En attente', 'Annulés'],
          datasets: [{
            data: [
              this.stats.totalPayes,
              this.stats.totalAttente,
              this.stats.totalAnnules
            ],
            backgroundColor: ['#2d6a4f', '#e67700', '#d00000'],
            hoverOffset: 8
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: '#333',
                font: { size: 14 }
              }
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const label = context.label || '';
                  const value = Number(context.raw || 0);
                  return `${label} : ${value.toLocaleString('fr-FR', {
                    style: 'currency',
                    currency: 'EUR'
                  })}`;
                }
              }
            }
          }
        }
      });
    }, 100);
  }

  /**
   * Nettoyage à la destruction
   */
  ngOnDestroy(): void {
    if (this.statsSubscription) {
      this.statsSubscription.unsubscribe();
    }
  }
}
