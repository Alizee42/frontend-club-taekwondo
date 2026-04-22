import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { SuiviPaiementsComponent } from '../../shared/components/suivi-paiements/suivi-paiements.component';
import { EcheanceComponent } from '../../shared/components/echeance/echeance.component';
import { AjoutPaiementComponent } from './ajout-paiement/ajout-paiement.component';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';
import { UiModalComponent } from '../../shared/ui/modal/ui-modal.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { PaymentAdminService } from '../../services/payment-admin.service';
import { DashboardStats } from '../../models/dashboard-stats.model';
import { DaySum } from '../../models/day-sum';
import { MembreRetard } from '../../models/membre-retard';

@Component({
  selector: 'app-gestion-paiements',
  standalone: true,
  imports: [
    CommonModule,
    SuiviPaiementsComponent,
    EcheanceComponent,
    AjoutPaiementComponent,
    UiButtonComponent,
    UiModalComponent,
    PageHeaderComponent
  ],
  templateUrl: './gestion-paiements.component.html',
  styleUrls: ['./gestion-paiements.component.css']
})
export class GestionPaiementsComponent implements OnInit, OnDestroy {
  ongletActif: 'paiements' | 'echeances' = 'paiements';
  modalAjoutVisible = false;
  paiements: any[] = [];

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
    this.statsSubscription = this.paymentService.dashboardStats$.subscribe((data) => {
      if (!data) {
        return;
      }

      this.stats = {
        totalPayes: data.totalPayes || 0,
        totalAnnules: data.totalAnnules || 0,
        totalAttente: data.totalAttente || 0,
        pourcentagePayesMois: data.pourcentagePayesMois || 0,
        courbe: data.courbe || [],
        membresEnRetard: data.membresEnRetard || []
      };
    });

    this.refreshStats();
    this.loadPaiements();
  }

  get totalPaiements(): number {
    return this.paiements.length;
  }

  get nbRetards(): number {
    return this.stats.membresEnRetard.length;
  }

  getAllEcheances(): any[] {
    if (!Array.isArray(this.paiements)) {
      return [];
    }

    return this.paiements.reduce((acc: any[], paiement: any) => {
      const echeances = Array.isArray(paiement.echeances)
        ? paiement.echeances.map((echeance: any) => ({
            ...echeance,
            paiementId: paiement.id,
            paiementDate: paiement.datePaiement,
            parentPrenom: paiement.utilisateurPrenom,
            parentNom: paiement.utilisateurNom,
            membrePrenom: paiement.membrePrenom,
            membreNom: paiement.membreNom,
            club: paiement.club || paiement.clubNom || paiement.clubName,
            montantTotal: paiement.montantTotal,
            montantPaye: paiement.montantPaye,
            montantRestant: paiement.montantRestant
          }))
        : [];

      return acc.concat(echeances);
    }, []);
  }

  loadPaiements(): void {
    this.paymentService.getAllPaiements().subscribe({
      next: (response) => {
        this.paiements = Array.isArray(response) ? response : [];

        this.paiements.forEach((paiement: any) => {
          if (Array.isArray(paiement.echeances) && paiement.echeances.length) {
            paiement.montantPaye = paiement.echeances.reduce((sum: number, echeance: any) => {
              const statut = (echeance?.statut || '').toString().toLowerCase();
              return statut === 'paye' || statut === 'payé' ? sum + (Number(echeance.montant) || 0) : sum;
            }, 0);
          } else {
            const statut = (paiement.statut || '').toString().toLowerCase();
            paiement.montantPaye = statut.includes('pay') ? Number(paiement.montantTotal) || 0 : 0;
          }

          paiement.montantRestant = Math.max(
            0,
            (Number(paiement.montantTotal) || 0) - (Number(paiement.montantPaye) || 0)
          );
        });
      },
      error: () => {
        this.paiements = [];
      }
    });
  }

  refreshStats(): void {
    this.paymentService.refreshDashboardStats().subscribe({
      next: () => undefined,
      error: () => undefined
    });
  }

  changerOnglet(onglet: 'paiements' | 'echeances'): void {
    this.ongletActif = onglet;
    if (onglet === 'echeances') {
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
    this.ongletActif = 'paiements';
    this.refreshStats();
    this.loadPaiements();
  }

  ngOnDestroy(): void {
    this.statsSubscription?.unsubscribe();
  }
}
