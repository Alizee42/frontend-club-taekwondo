import { Component, OnInit, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StripeService } from '../../services/stripe.service';

@Component({
  selector: 'app-paiements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './paiements.component.html',
  styleUrls: ['./paiements.component.css']
})
export class PaiementsComponent implements OnInit, AfterViewInit {
calculerProgression(_t74: any) {
throw new Error('Method not implemented.');
}
  paiements: any[] = [];
  montant: number = 300;
  modePaiement: string = 'unique';
  nombreEcheances: number = 1;
  echeancesOptions: number[] = [];
  cardElement: any;
  stripe: any;
  modalOuverte: boolean = false;
  paiementActuel: any = null;

  step: number = 1;
  maxStep: number = 3;
  historiqueOuvert: boolean = false;
  enCoursDePaiement: boolean = false;

  constructor(private http: HttpClient, private stripeService: StripeService) {}

  ngOnInit(): void {
    this.loadPaiements();
    this.genererOptionsEcheances();
  }

  genererOptionsEcheances(): void {
    this.echeancesOptions = [2, 3, 4];
  }

  ngAfterViewInit(): void {}

  initStripeElement(context: string): void {
    setTimeout(() => {
      const cardElementContainer = document.querySelector('#card-element');
      if (!cardElementContainer) return;

      if (!this.stripe) {
        this.stripeService.getStripeInstance().then((stripe: any) => {
          this.stripe = stripe;
          const elements = stripe.elements();
          this.cardElement = elements.create('card', {
            style: {
              base: {
                fontSize: '16px',
                color: '#0d1a4a',
                '::placeholder': { color: '#aab7c4' }
              },
              invalid: {
                color: '#e55353',
                iconColor: '#e55353'
              }
            }
          });
          this.cardElement.mount('#card-element');
        }).catch(console.error);
      } else {
        this.cardElement.mount('#card-element');
      }
    }, 0);
  }

  loadPaiements(): void {
    const token = localStorage.getItem('token');
    this.http.get<any[]>('http://localhost:8080/api/paiements', {
        headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
        next: (data) => {
            console.log('Paiements reçus :', data);
            this.paiements = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        },
        error: console.error
    });
  }

  initierPaiement(): void {
    if (!this.cardElement) return alert("Une erreur est survenue. Veuillez réessayer.");
    const token = localStorage.getItem('token');
    if (!token) return alert("Vous devez être connecté pour effectuer un paiement.");

    const paiementData = {
      amount: this.modePaiement === 'unique' ? this.montant : (this.montant / this.nombreEcheances),
      currency: 'eur',
      modePaiement: this.modePaiement,
      nombreEcheances: this.modePaiement === 'echeances' ? this.nombreEcheances : 1
    };

    this.enCoursDePaiement = true;

    this.http.post('http://localhost:8080/api/paiements/create-payment-intent', paiementData, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (response: any) => {
        const clientSecret = response.clientSecret;
        this.stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: this.cardElement,
            billing_details: { name: 'Nom du client' }
          }
        }).then((result: any) => {
          this.enCoursDePaiement = false;
          if (result.error) {
            alert('Erreur lors du paiement : ' + result.error.message);
          } else {
            alert('Paiement réussi !');
            this.loadPaiements();
            this.step = 3;
          }
        });
      },
      error: () => {
        this.enCoursDePaiement = false;
        alert('Une erreur est survenue lors du paiement.');
      }
    });
  }

  nextStep(): void {
    if (this.step < this.maxStep) {
      this.step++;
      if (this.step === 2) {
        setTimeout(() => {
          const cardElementContainer = document.querySelector('#card-element');
          if (cardElementContainer) this.initStripeElement('formulaire');
        }, 200);
      }
    }
  }

  previousStep(): void {
    if (this.step > 1) this.step--;
  }

  toggleHistorique(): void {
    this.historiqueOuvert = !this.historiqueOuvert;
  }

  payerEcheances(): void {
    if (!this.paiementActuel) {
      console.error('Aucun paiement sélectionné.');
      return alert('Veuillez d’abord sélectionner un paiement.');
    }

    if (!this.cardElement) {
      console.error("Élément Stripe non monté.");
      return alert("Une erreur est survenue. Veuillez réessayer.");
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.error("Token non trouvé.");
      return alert("Vous devez être connecté pour effectuer un paiement.");
    }

    if (
      this.paiementActuel.montantRestant === null ||
      this.paiementActuel.echeancesRestantes === null
    ) {
      console.error('Paiement actuel invalide :', this.paiementActuel);
      return alert("Les informations du paiement sont invalides.");
    }

    const montantParEcheance = this.paiementActuel.montantRestant / this.paiementActuel.echeancesRestantes;
    const montantTotalAPayer = montantParEcheance * this.nombreEcheances;

    const paiementData = {
      nombreEcheances: this.nombreEcheances,
      montantTotalAPayer: parseFloat(montantTotalAPayer.toFixed(2))
    };

    this.enCoursDePaiement = true;

    this.http.post(`http://localhost:8080/api/paiements/${this.paiementActuel.id}/payer-echeance`, paiementData, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: () => {
        alert(`Échéance(s) payée(s) avec succès.`);
        this.loadPaiements();
        this.fermerModalPaiement();
        this.step = 3;
        this.enCoursDePaiement = false;
      },
      error: (err) => {
        alert('Une erreur est survenue lors du paiement.');
        console.error(err);
        this.enCoursDePaiement = false;
      }
    });
  }

  ouvrirModalPaiement(paiement: any): void {
    console.log('Paiement sélectionné :', paiement);

    if (!paiement || paiement.echeancesRestantes <= 0 || paiement.montantRestant <= 0) {
      alert("Ce paiement ne peut pas être modifié.");
      return;
    }

    this.paiementActuel = paiement;
    this.echeancesOptions = Array.from({ length: paiement.echeancesRestantes }, (_, i) => i + 1);
    this.nombreEcheances = 1;
    this.modalOuverte = true;

    setTimeout(() => {
      this.initStripeElement('modal');
    }, 100);
  }

  fermerModalPaiement(): void {
    this.modalOuverte = false;
    this.paiementActuel = null;
  }

  verifierEcheances(): void {
    this.paiements.forEach((paiement) => {
      if (paiement.echeancesRestantes > 0 && paiement.statut === 'en attente') {
        const montantParEcheance = paiement.montantRestant / paiement.echeancesRestantes;
        alert(`Rappel : Vous avez ${paiement.echeancesRestantes} échéance(s) restante(s) de ${montantParEcheance.toFixed(2)} €.`);
      }
    });
  }
}
