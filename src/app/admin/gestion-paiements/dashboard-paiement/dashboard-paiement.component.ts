import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardStats } from '../../../models/dashboard-stats.model';
import { PaymentAdminService } from '../../../services/payment-admin.service';
import {
  Chart,
  ArcElement,
  Tooltip,
  Legend,
  DoughnutController // ✅ Correction ici
} from 'chart.js';
import { DaySum } from '../../../models/day-sum';
import { MembreRetard } from '../../../models/membre-retard';

// ✅ Enregistrement du bon contrôleur
Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

@Component({
  selector: 'app-dashboard-paiement',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-paiement.component.html',
  styleUrls: ['./dashboard-paiement.component.css']
})
export class DashboardPaiementComponent implements OnInit {
  stats!: DashboardStats & {
    courbe: DaySum[];
    membresEnRetard: MembreRetard[];
  };

  chart: Chart | null = null;

  constructor(private paymentService: PaymentAdminService) {}

 ngOnInit(): void {
  console.log('[🔄 INIT] Chargement du tableau de bord...');
  this.paymentService.getDashboardStats().subscribe({
    next: (data: any) => {
      console.log('[✅ DATA REÇUE]', data);

      this.stats = {
        totalPayes: data.totalPayes,
        totalAnnules: data.totalAnnules,
        totalAttente: data.totalAttente,
        pourcentagePayesMois: data.pourcentagePayesMois,
        courbe: data.courbe30J || [],
        membresEnRetard: data.membresEnRetard || [] // 🔄 Remplace topRetards par membresEnRetard
      };

      console.log('[👀 Membres en retard]', this.stats.membresEnRetard);

      this.buildDoughnutChart();
    },
    error: err => {
      console.error('[⛔ ERREUR API]', err);
    }
  });
}

  buildDoughnutChart(): void {
    console.log('[🍩 BUILD DOUGHNUT CHART]');

    setTimeout(() => {
      const canvas = document.getElementById('doughnutChart') as HTMLCanvasElement;
      if (!canvas) {
        console.warn('[⚠️] Canvas #doughnutChart introuvable dans le DOM'); // ✅ correction ici
        return;
      }

      if (this.chart) this.chart.destroy();

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
    }, 100); // délai pour s’assurer que le DOM est prêt
  }
}
