import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // ✅ à importer
import { DashboardStats } from '../../../models/dashboard-stats.model';
import { PaymentAdminService } from '../../../services/payment-admin.service';
import { Chart } from 'chart.js';
import { DaySum } from '../../../models/day-sum';
import { MembreRetard } from '../../../models/membre-retard';

@Component({
  selector: 'app-dashboard-paiement',
  standalone: true,
  imports: [CommonModule], // ✅ à ajouter
  templateUrl: './dashboard-paiement.component.html',
  styleUrls: ['./dashboard-paiement.component.css']
})
export class DashboardPaiementComponent implements OnInit {
stats!: DashboardStats & {
  courbe: DaySum[];
  membresEnRetard: MembreRetard[];
};

  constructor(private paymentService: PaymentAdminService) {}

  ngOnInit(): void {
    this.paymentService.getDashboardStats().subscribe(data => {
      this.stats = data;
      this.buildChart();
    });
  }

  buildChart(): void {
    if (!this.stats?.courbe) return;

    const labels = this.stats.courbe.map(item => item.datePaiement);
    const data = this.stats.courbe.map(item => item.total);

    new Chart('paiementsChart', {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Montants encaissés',
          data,
          fill: true,
          tension: 0.4,
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }
}
