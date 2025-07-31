import { Component, OnInit, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StripeService } from '../../services/stripe.service';
import { ParametresPaiementService } from '../../services/parametres-paiement.service';

@Component({
  selector: 'app-paiement-parent',
  imports: [CommonModule, FormsModule],
  templateUrl: './paiement-parent.component.html',
  styleUrl: './paiement-parent.component.css'
})
export class PaiementParentComponent implements OnInit, AfterViewInit {
  // Étapes
  step: number = 1;
  maxStep: number = 4;

  // Enfants
  membres: { id: number; nom: string; prenom: string }[] = [];
  enfantSelectionne: number | null = null;
  enfantSelectionneNom: string = '';

  // Paiements
  paiements: any[] = [];
  paiementsUniques: any[] = [];
  paiementsEcheances: any[] = [];

  // Montants et options
  montantInitial: number = 0;
  modePaiement: string = 'unique';
  nombreEcheances: number = 1;
  echeancesOptions: number[] = [];
  montantTotalAPayer: number = 0;

  // Stripe
  stripe: any;
  cardElement: any;
  cardElementModal: any;

  // Modale
  modalOuverte: boolean = false;
  paiementActuel: any = null;
  echeanceEnCours: any = null;

  // Statuts de paiement
  enCoursDePaiement: boolean = false;
  paiementReussi: boolean = false;
  paiementErreur: boolean = false;
  erreurMessage: string = '';

  // Sections ouvertes
  sectionOuverte: { [key: string]: boolean } = { unique: true, echeances: true };

  constructor(
    private http: HttpClient,
    private stripeService: StripeService,
    private parametresService: ParametresPaiementService
  ) {}

  ngOnInit(): void {
    // Charger les paramètres de paiement
   this.parametresService.parametres$.subscribe((parametres) => {
    if (parametres) {
      this.montantInitial = parametres.montantCotisation;
      this.echeancesOptions = Array.from({ length: parametres.echeancesAutorisees }, (_, i) => i + 1);
      this.nombreEcheances = parametres.echeancesAutorisees; // Correction : initialise le nombre d'échéances
    }
    this.loadMembresEnfants();
  });

    // Charger les paiements
    this.loadPaiements();
  }

  ngAfterViewInit(): void {}

  // Charger les membres enfants
loadMembresEnfants(): void {
  const token = localStorage.getItem('token');
  if (!token) {
    this.membres = [];
    return;
  }

  this.http.get<{ id: number; nom: string; prenom: string }[]>(
    'http://localhost:8080/api/membres/mes-enfants',
    { headers: { Authorization: `Bearer ${token}` } }
  ).subscribe({
    next: (data) => {
      this.membres = data;
    },
    error: (err) => {
      console.error('Erreur chargement enfants', err);
      this.membres = [];
    }
  });
}

  // Étapes
  nextStep(): void {
    if (this.step < this.maxStep) {
      this.step++;
      if (this.step === 3) setTimeout(() => this.initStripeElement(), 200);
    }
  }

  previousStep(): void {
    if (this.step > 1) this.step--;
  }

  // Sélection d'un enfant
  selectMembre(membre: { id: number; nom: string; prenom: string }): void {
    this.enfantSelectionne = membre.id;
    this.enfantSelectionneNom = `${membre.prenom} ${membre.nom}`;
  }

  // Stripe
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

  // Paiements
  loadPaiements(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<any[]>('http://localhost:8080/api/paiements', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (data) => {
        this.paiements = data.map(p => ({
          ...p,
          modePaiement: p.modePaiement === 'carte' ? 'unique' : p.modePaiement,
          echeances: p.echeances || []
        }));
        this.mettreAJourFiltresPaiements();
      },
      error: (err) => {
        console.error("❌ Erreur lors du chargement des paiements :", err);
      }
    });
  }

  mettreAJourFiltresPaiements(): void {
    this.paiementsUniques = this.paiements.filter(p => p.modePaiement === 'unique');
    this.paiementsEcheances = this.paiements.filter(p => p.modePaiement === 'echeances');
  }

  initierPaiement(): void {
    if (this.enCoursDePaiement) return;

    const montant = this.montantInitial;
    if (montant <= 0 || !this.cardElement) return alert("Erreur : montant invalide ou Stripe non chargé.");
    this.montantTotalAPayer = montant;

    const token = localStorage.getItem('token');
    const utilisateurId = Number(localStorage.getItem('utilisateurId'));

    if (!token) {
      this.erreurMessage = 'Utilisateur non authentifié';
      this.paiementErreur = true;
      return;
    }

    const data = {
      amount: montant,
      currency: 'eur',
      modePaiement: this.modePaiement,
      typePaiement: this.modePaiement === 'unique' ? 'unique' : 'echeances',
      nombreEcheances: this.modePaiement === 'echeances' ? this.nombreEcheances : 1,
      utilisateurId,
      enfantId: this.enfantSelectionne // Ajout de l'enfant sélectionné
    };

    this.enCoursDePaiement = true;
    this.paiementErreur = false;
    this.paiementReussi = false;

    this.http.post('http://localhost:8080/api/stripe/create-payment-intent', data, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        const clientSecret = res?.clientSecret;
        if (!clientSecret) {
          this.erreurMessage = 'Erreur : clientSecret non reçu.';
          this.paiementErreur = true;
          this.enCoursDePaiement = false;
          return;
        }
        this.confirmerPaiementStripe(clientSecret, this.cardElement, () => {
          this.loadPaiements();
          this.paiementReussi = true;
          this.enCoursDePaiement = false;
          this.nextStep(); // Passer à l'étape suivante
        });
      },
      error: () => {
        this.erreurMessage = 'Erreur lors de la création du paiement.';
        this.paiementErreur = true;
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
        this.erreurMessage = result.error.message;
        this.paiementErreur = true;
      } else {
        callback();
      }
    });
  }

  toggleSection(section: string): void {
    this.sectionOuverte[section] = !this.sectionOuverte[section];
  }

  getMontantParEcheance(): number {
    return this.modePaiement === 'echeances' && this.nombreEcheances > 0
      ? this.montantInitial / this.nombreEcheances
      : 0;
  }

  calculerMontantRestant(paiement: any): number {
    if (!paiement.echeances || paiement.echeances.length === 0) return paiement.montantTotal;

    const montantPayé = paiement.echeances
      .filter((echeance: any) => echeance.statut === 'payé')
      .reduce((total: number, echeance: any) => total + echeance.montant, 0);

    return paiement.montantTotal - montantPayé;
  }

  genererEcheancier(paiement: any): any[] {
    return paiement.echeances || [];
  }

  ouvrirModalPaiement(paiement: any, echeance: any): void {
    if (!paiement || !echeance || echeance.statut === 'payé') {
      console.error("Erreur : cette échéance ne peut pas être payée.");
      return;
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
      alert("Erreur : informations manquantes.");
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      this.erreurMessage = 'Authentification requise.';
      this.paiementErreur = true;
      return;
    }

    const data = {
      id: this.echeanceEnCours.id,
      montant: this.echeanceEnCours.montant
    };

    this.enCoursDePaiement = true;

    this.http.post(`http://localhost:8080/api/paiements/${this.paiementActuel.id}/payer-echeance`, [data], {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: () => {
        this.loadPaiements();
        this.fermerModalPaiement();
        this.paiementReussi = true;
        this.enCoursDePaiement = false;
      },
      error: () => {
        this.erreurMessage = 'Erreur lors du paiement de l’échéance.';
        this.paiementErreur = true;
        this.enCoursDePaiement = false;
      }
    });
  }
}