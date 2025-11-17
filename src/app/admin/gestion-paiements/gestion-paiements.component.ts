import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { Chart, ArcElement, Tooltip, Legend, DoughnutController } from 'chart.js';

import { SuiviPaiementsComponent } from './suivi-paiements/suivi-paiements.component';
import { AjoutPaiementComponent } from './ajout-paiement/ajout-paiement.component';
import { UiTitleComponent } from '../../shared/ui/title/ui-title.component';
import { UiTableComponent } from '../../shared/components/ui-table/ui-table.component';
import type { UiTableColumn } from '../../shared/components/ui-table/ui-table.component';
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
    AjoutPaiementComponent,
    UiTitleComponent,
    UiTableComponent,
    ],
    templateUrl: './gestion-paiements.component.html',
    styleUrls: ['./gestion-paiements.component.css']
  })
export class GestionPaiementsComponent implements OnInit, OnDestroy {
  constructor(private paymentService: PaymentAdminService) {}
  echeancesColumns = [
    { key: 'datePaiement', label: 'Date', type: 'date' as const, cellClass: undefined, display: (row: any) => this.formatDate(row && row.datePaiement) },
    { key: 'utilisateur', label: 'Payé par', type: 'text' as const, cellClass: undefined, display: (row: any) => `${row && row.utilisateurPrenom ? row.utilisateurPrenom : ''} ${row && row.utilisateurNom ? row.utilisateurNom : ''}` },
    { key: 'membre', label: 'Pour', type: 'text' as const, cellClass: undefined, display: (row: any) => `${row && row.membrePrenom ? row.membrePrenom : ''} ${row && row.membreNom ? row.membreNom : ''}` },
    { key: 'type', label: 'Type de paiement', type: 'text' as const, cellClass: undefined, display: (row: any) => `${row && row.type ? row.type : ''} – ${row && row.modePaiement ? row.modePaiement : ''}` },
    { key: 'montantTotal', label: 'Total', type: 'number' as const, cellClass: 'num', display: (row: any) => this.formatCurrency(row && row.montantTotal) },
    { key: 'montantPaye', label: 'Payé', type: 'number' as const, cellClass: 'num', display: (row: any) => this.formatCurrency(row && (row.montantPaye != null ? row.montantPaye : row.montantTotal)) },
    { key: 'montantRestant', label: 'Restant', type: 'number' as const, cellClass: 'num', display: (row: any) => this.formatCurrency(row && (row.montantRestant != null ? row.montantRestant : ((row.montantTotal || 0) - (row.montantPaye || 0)))) },
    { key: 'statut', label: 'Statut', type: 'text' as const, cellClass: undefined }
  ];
  echeancesActions = [
    // Exemple d'action, à adapter selon besoins
    // { label: 'Voir', icon: 'ri-eye-line', action: 'voir', variant: 'secondary' },
    // { label: 'Relancer', icon: 'ri-mail-send-line', action: 'relancer', variant: 'primary', show: (row: any) => row.statut === 'En attente' }
  ];

  onEcheanceAction(event: { action: string, row: any }) {
    // À compléter selon les actions souhaitées
    console.log('Action sur échéance', event);
  }

  formatDate(date: string | Date): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR');
  }

  formatCurrency(val: number): string {
    if (val == null) return '';
    return val.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  }
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

  paiements: any[] = [];
  private statsSubscription?: Subscription;


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
    this.loadPaiements();
  }

  loadPaiements(): void {
    this.paymentService.getAllPaiements().subscribe({
      next: (res) => {
        this.paiements = Array.isArray(res) ? res : [];
        // Debug + robustification : calculer localement montantPaye / montantRestant
        try {
          this.paiements.forEach((p: any) => {
            // montant payé = somme des échéances payées si présentes
            if (Array.isArray(p.echeances) && p.echeances.length) {
              p.montantPaye = p.echeances.reduce((s: number, e: any) => {
                const st = (e && e.statut || '').toString().toLowerCase();
                return st === 'payé' || st === 'paye' ? s + (Number(e.montant) || 0) : s;
              }, 0);
            } else {
              p.montantPaye = (p.statut || '').toString().toLowerCase().includes('pay') || (p.statut || '').toString().toLowerCase().includes('payé') ? (Number(p.montantTotal) || 0) : 0;
            }
            p.montantRestant = Math.max(0, (Number(p.montantTotal) || 0) - (Number(p.montantPaye) || 0));
          });
        } catch (err) {
          console.warn('[GestionPaiements] erreur lors du calcul local des montants', err);
        }
        console.log('[GestionPaiements] paiements chargés:', this.paiements.length, this.paiements.slice ? this.paiements.slice(0,3) : this.paiements);
      },
      error: (err) => {
        this.paiements = [];
      }
    });
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
    if (onglet === 'echeances') {
      console.log('[GestionPaiements] bascule onglet echeances - paiements current length=', this.paiements.length);
      this.loadPaiements();
    }
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
    this.loadPaiements();
  }

  ngOnDestroy(): void {
    if (this.statsSubscription) {
      this.statsSubscription.unsubscribe();
    }
  }
}
