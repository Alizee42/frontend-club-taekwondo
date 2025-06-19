import { Component, OnInit, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StripeService } from '../../services/stripe.service';

@Component({
  selector: 'app-paiements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './paiement.component.html',
  styleUrls: ['./paiement.component.css']
})
export class PaiementComponent implements OnInit, AfterViewInit {
  paiements: any[] = [];
  paiementsUniques: any[] = [];
  paiementsEcheances: any[] = [];

  montantInitial: number = 300;
  modePaiement: string = 'unique';
  nombreEcheances: number = 1;
  echeancesOptions: number[] = [2, 3, 4];

  stripe: any;
  cardElement: any;
  cardElementModal: any;

  modalOuverte: boolean = false;
  paiementActuel: any = null;
  echeanceEnCours: any = null;
  montantTotalAPayer: number = 0;

  enCoursDePaiement: boolean = false;
  step: number = 1;
  maxStep: number = 3;

  sectionOuverte: { [key: string]: boolean } = { unique: true, echeances: true };

  constructor(private http: HttpClient, private stripeService: StripeService) {}

  ngOnInit(): void {
    this.loadPaiements(); 
  }

  ngAfterViewInit(): void {}

  initStripeElement(): void {
    setTimeout(() => {
      const container = document.querySelector('#card-element');
      if (!container) return;

      if (!this.stripe) {
        this.stripeService.getStripeInstance().then((stripe: any) => {
          this.stripe = stripe;
          const elements = stripe.elements();
          this.cardElement = elements.create('card');
          this.cardElement.mount('#card-element');
        });
      } else {
        this.cardElement.mount('#card-element');
      }
    }, 0);
  }

  initStripeElementModal(): void {
    const container = document.querySelector('#card-element-modal');
    if (!container) return;

    if (!this.stripe) {
      this.stripeService.getStripeInstance().then((stripe: any) => {
        this.stripe = stripe;
        const elements = stripe.elements();
        this.cardElementModal = elements.create('card');
        this.cardElementModal.mount('#card-element-modal');
      });
    } else {
      const elements = this.stripe.elements();
      this.cardElementModal = elements.create('card');
      this.cardElementModal.mount('#card-element-modal');
    }
  }

  loadPaiements(): void {
    const token = localStorage.getItem('token');
    this.http.get<any[]>('http://localhost:8080/api/paiements', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (data) => {
        this.paiements = data.map(p => ({
          ...p,
          modePaiement: p.modePaiement === 'carte' ? 'unique' : p.modePaiement,
          montantRestant: p.montant_restant ?? 0,
          montantTotal: p.montant_total ?? 0,
          echeances: p.echeances || []
        }));
        this.mettreAJourFiltresPaiements();
      }
    });
  }

  mettreAJourFiltresPaiements(): void {
    this.paiementsUniques = this.paiements.filter(p => p.modePaiement === 'unique');
    this.paiementsEcheances = this.paiements.filter(p => p.modePaiement === 'echeances');
  }

  nextStep(): void {
    if (this.step < this.maxStep) {
      this.step++;
      if (this.step === 2) setTimeout(() => this.initStripeElement(), 200);
    }
  }

  previousStep(): void {
    if (this.step > 1) this.step--;
  }

  initierPaiement(): void {
    if (this.enCoursDePaiement) return;

    const montant = this.modePaiement === 'unique' ? this.montantInitial : this.getMontantParEcheance();
    if (montant <= 0 || !this.cardElement) return alert("Erreur : montant invalide ou Stripe non chargé.");
    this.montantTotalAPayer = montant;

    const token = localStorage.getItem('token');
    const utilisateurId = Number(localStorage.getItem('utilisateurId'));

    const data = {
      amount: montant,
      currency: 'eur',
      modePaiement: this.modePaiement,
      typePaiement: this.modePaiement === 'unique' ? 'unique' : 'echeances',
      nombreEcheances: this.modePaiement === 'echeances' ? this.nombreEcheances : 1,
      utilisateurId
    };

    this.enCoursDePaiement = true;

    this.http.post('http://localhost:8080/api/paiements/create-payment-intent', data, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        const clientSecret = res?.clientSecret;
        if (!clientSecret) return alert("Erreur : clientSecret non reçu.");
        this.confirmerPaiementStripe(clientSecret, this.cardElement, () => {
          this.loadPaiements();
          this.enCoursDePaiement = false;
        });
      },
      error: () => {
        alert('Erreur lors de la création du paiement.');
        this.enCoursDePaiement = false;
      }
    });
  }

  confirmerPaiementStripe(clientSecret: string, element: any, callback: () => void): void {
    this.stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: element, billing_details: { name: 'Nom du client' } }
    }).then((result: any) => {
      this.enCoursDePaiement = false;
      if (result.error) {
        alert('Erreur : ' + result.error.message);
      } else {
        callback();
        this.step = 3;
      }
    });
  }

  ouvrirModalPaiement(paiement: any, echeance: any): void {
    if (!paiement || !echeance || echeance.statut === 'payé') {
      return alert("Cette échéance ne peut pas être payée.");
    }

    this.paiementActuel = paiement;
    this.echeanceEnCours = echeance;

    const montant = Number(echeance.montant);
    this.montantTotalAPayer = isNaN(montant) ? 0 : montant;

    this.modalOuverte = true;

    if (this.cardElementModal) {
      this.cardElementModal.unmount();
      this.cardElementModal = null;
    }

    setTimeout(() => this.initStripeElementModal(), 300);
  }

  fermerModalPaiement(): void {
    this.modalOuverte = false;
    this.paiementActuel = null;
    this.echeanceEnCours = null;
    if (this.cardElementModal) {
      this.cardElementModal.unmount();
      this.cardElementModal = null;
    }
  }

  payerEcheances(): void {
    if (!this.echeanceEnCours || !this.cardElementModal) {
      return alert("Erreur : informations manquantes.");
    }

    const token = localStorage.getItem('token');
    this.enCoursDePaiement = true;

    this.http.post(`http://localhost:8080/api/echeances/${this.echeanceEnCours.id}/payer`, {}, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'text'
    }).subscribe({
      next: () => {
        this.loadPaiements();
        this.fermerModalPaiement();
        this.enCoursDePaiement = false;
        alert('Paiement reçu ! ✅');
      },
      error: () => {
        alert('Erreur lors du paiement.');
        this.enCoursDePaiement = false;
      }
    });
  }

  genererEcheancier(paiement: any): { numero: number; date: Date; montant: number; statut: string; id: number }[] {
    if (!paiement?.echeances?.length) return [];
  
    return paiement.echeances
      .map((e: any) => ({
        numero: e.numero, // Utiliser le numéro existant renvoyé par le backend
        date: new Date(e.dateEcheance),
        montant: e.montant,
        statut: e.statut,
        id: e.id
      }))
      .sort((a: { date: Date }, b: { date: Date }) => a.date.getTime() - b.date.getTime());
  }

  toggleSection(section: string): void {
    this.sectionOuverte[section] = !this.sectionOuverte[section];
  }

  getMontantTotalEcheances(): number {
    return this.montantInitial;
  }

  getMontantParEcheance(): number {
    return this.modePaiement === 'echeances' && this.nombreEcheances > 0
      ? this.montantInitial / this.nombreEcheances
      : 0;
  }
}
