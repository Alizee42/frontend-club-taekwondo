import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SuiviPaiementsComponent } from '../../shared/components/suivi-paiements/suivi-paiements.component';
import { EcheanceComponent } from '../../shared/components/echeance/echeance.component';
import { AjoutPaiementComponent } from './ajout-paiement/ajout-paiement.component';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';
import { UiModalComponent } from '../../shared/ui/modal/ui-modal.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { AlertBannerComponent } from '../../shared/ui/alert-banner/alert-banner.component';
import { PaymentAdminService } from '../../services/payment-admin.service';
import { ParametresPaiementService } from '../../services/parametres-paiement.service';
import { ClubService } from '../../services/club.service';
import { ParametresPaiement } from '../../models/parametres-paiement';
import { DashboardStats } from '../../models/dashboard-stats.model';
import { DaySum } from '../../models/day-sum';
import { MembreRetard } from '../../models/membre-retard';

@Component({
  selector: 'app-gestion-paiements',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SuiviPaiementsComponent,
    EcheanceComponent,
    AjoutPaiementComponent,
    UiButtonComponent,
    UiModalComponent,
    PageHeaderComponent,
    AlertBannerComponent
  ],
  templateUrl: './gestion-paiements.component.html',
  styleUrls: ['./gestion-paiements.component.css']
})
export class GestionPaiementsComponent implements OnInit, OnDestroy {
  ongletActif: 'paiements' | 'parents' | 'echeances' = 'paiements';
  modalAjoutVisible = false;
  paiements: any[] = [];

  stats: DashboardStats & { courbe: DaySum[]; membresEnRetard: MembreRetard[] } = {
    totalPayes: 0,
    totalAnnules: 0,
    totalAttente: 0,
    pourcentagePayesMois: 0,
    courbe: [],
    membresEnRetard: []
  };

  parametres: ParametresPaiement = {
    montantCotisation: 100,
    stripe: true,
    virement: true,
    especes: true,
    modePaiementParDefaut: 'stripe',
    echeancesAutorisees: 3,
    intervalleEcheance: 'MENSUEL'
  };
  paramsSaving = false;
  paramsSaved = false;
  paramsError = '';

  private subs: Subscription[] = [];

  constructor(
    private paymentService: PaymentAdminService,
    private parametresService: ParametresPaiementService,
    private clubService: ClubService
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.paymentService.dashboardStats$.subscribe(data => {
        if (!data) return;
        this.stats = {
          totalPayes: data.totalPayes || 0,
          totalAnnules: data.totalAnnules || 0,
          totalAttente: data.totalAttente || 0,
          pourcentagePayesMois: data.pourcentagePayesMois || 0,
          courbe: data.courbe || [],
          membresEnRetard: data.membresEnRetard || []
        };
      })
    );

    this.refreshStats();
    this.loadPaiements();
    this.loadParametres();
  }

  get totalPaiements(): number { return this.paiements.length; }
  get nbRetards(): number { return this.paiements.filter(p => this.isPaiementLate(p)).length; }
  get totalFacture(): number { return this.paiements.reduce((sum, p) => sum + (Number(p.montantTotal) || 0), 0); }
  get totalEncaisse(): number { return this.paiements.reduce((sum, p) => sum + this.getMontantPaye(p), 0); }
  get totalRestant(): number { return Math.max(0, this.totalFacture - this.totalEncaisse); }
  get tauxEncaissement(): number { return this.totalFacture > 0 ? Math.round((this.totalEncaisse / this.totalFacture) * 1000) / 10 : 0; }
  get paiementsSoldes(): number { return this.paiements.filter(p => this.getMontantRestant(p) <= 0).length; }
  get paiementsOuverts(): number { return Math.max(0, this.totalPaiements - this.paiementsSoldes); }
  get paiementsOuvertsLabel(): string { return this.paiementsOuverts === 1 ? '1 paiement en attente' : `${this.paiementsOuverts} paiements en attente`; }
  get paiementsSoldesLabel(): string { return this.paiementsSoldes === 1 ? '1 paiement solde' : `${this.paiementsSoldes} paiements soldes`; }
  get prochaineEcheance(): any | null {
    const now = new Date();
    const upcoming = this.paiements
      .flatMap(p => (Array.isArray(p.echeances) ? p.echeances : []).map((e: any) => ({ ...e, paiement: p })))
      .filter(e => !this.isPaidStatus(e.statut) && e.dateEcheance)
      .sort((a, b) => new Date(a.dateEcheance).getTime() - new Date(b.dateEcheance).getTime());
    return upcoming.find(e => new Date(e.dateEcheance) >= now) || upcoming[0] || null;
  }

  getAllEcheances(): any[] {
    if (!Array.isArray(this.paiements)) return [];
    return this.paiements.reduce((acc: any[], p: any) => {
      const echeances = Array.isArray(p.echeances)
        ? p.echeances.map((e: any) => ({
            ...e,
            paiementId: p.id,
            paiementDate: p.datePaiement,
            parentPrenom: p.utilisateurPrenom,
            parentNom: p.utilisateurNom,
            membrePrenom: p.membrePrenom,
            membreNom: p.membreNom,
            club: p.club || p.clubNom || p.clubName,
            montantTotal: p.montantTotal,
            montantPaye: p.montantPaye,
            montantRestant: p.montantRestant
          }))
        : [];
      return acc.concat(echeances);
    }, []);
  }

  loadPaiements(): void {
    this.paymentService.getAllPaiements().subscribe({
      next: (res) => {
        this.paiements = Array.isArray(res) ? res : [];
        this.paiements.forEach((p: any) => {
          if (Array.isArray(p.echeances) && p.echeances.length) {
            p.montantPaye = p.echeances.reduce((sum: number, e: any) => {
              const s = (e?.statut || '').toLowerCase();
              return s === 'paye' || s === 'payé' ? sum + (Number(e.montant) || 0) : sum;
            }, 0);
          } else {
            const s = (p.statut || '').toLowerCase();
            p.montantPaye = s.includes('pay') ? Number(p.montantTotal) || 0 : 0;
          }
          p.montantRestant = Math.max(0, (Number(p.montantTotal) || 0) - (Number(p.montantPaye) || 0));
        });
      },
      error: () => { this.paiements = []; }
    });
  }

  private normalize(value: any): string {
    return String(value || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
  }

  private isPaidStatus(statut: any): boolean {
    return this.normalize(statut).includes('paye');
  }

  private getMontantPaye(p: any): number {
    if (!p) return 0;
    if (Array.isArray(p.echeances) && p.echeances.length) {
      return p.echeances.reduce((sum: number, e: any) => {
        return this.isPaidStatus(e?.statut) ? sum + (Number(e?.montant) || 0) : sum;
      }, 0);
    }
    return this.isPaidStatus(p.statut) ? Number(p.montantTotal) || 0 : Number(p.montantPaye) || 0;
  }

  private getMontantRestant(p: any): number {
    return Math.max(0, (Number(p?.montantTotal) || 0) - this.getMontantPaye(p));
  }

  private isPaiementLate(p: any): boolean {
    if (this.normalize(p?.statut).includes('retard')) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (Array.isArray(p?.echeances) ? p.echeances : []).some((e: any) => {
      if (this.isPaidStatus(e?.statut) || !e?.dateEcheance) return false;
      const due = new Date(e.dateEcheance);
      due.setHours(0, 0, 0, 0);
      return due < today;
    });
  }

  refreshStats(): void {
    this.paymentService.refreshDashboardStats().subscribe({ next: () => undefined, error: () => undefined });
  }

  loadParametres(): void {
    const clubId = this.clubService.getSelectedClub()?.id;
    if (!clubId) return;
    this.parametresService.getParametresPaiementByClub(clubId).subscribe({
      next: (p) => { if (p) this.parametres = p; },
      error: () => undefined
    });
  }

  sauvegarderParametres(): void {
    const clubId = this.clubService.getSelectedClub()?.id;
    if (!clubId) return;
    this.paramsSaving = true;
    this.paramsError = '';
    this.paramsSaved = false;
    this.parametresService.sauvegarderParClub(clubId, this.parametres).subscribe({
      next: () => {
        this.paramsSaving = false;
        this.paramsSaved = true;
        setTimeout(() => this.paramsSaved = false, 3000);
      },
      error: (err) => {
        this.paramsSaving = false;
        this.paramsError = err?.error?.message || 'Erreur lors de la sauvegarde';
      }
    });
  }

  changerOnglet(onglet: 'paiements' | 'parents' | 'echeances'): void {
    this.ongletActif = onglet;
    if (onglet === 'echeances') this.loadPaiements();
  }

  ouvrirModalAjout(): void { this.modalAjoutVisible = true; }
  fermerModalAjout(): void { this.modalAjoutVisible = false; }

  onPaiementAjoute(): void {
    this.fermerModalAjout();
    this.ongletActif = 'paiements';
    this.refreshStats();
    this.loadPaiements();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }
}
