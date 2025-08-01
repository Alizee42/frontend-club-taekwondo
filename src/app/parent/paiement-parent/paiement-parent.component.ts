import { Component, OnInit, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StripeService } from '../../services/stripe.service';
import { ParametresPaiementService } from '../../services/parametres-paiement.service';

@Component({
  selector: 'app-paiement-parent',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './paiement-parent.component.html',
  styleUrls: ['./paiement-parent.component.css']
})
export class PaiementParentComponent implements OnInit, AfterViewInit {
  step = 1;
  maxStep = 4;

  enfants: { id: number; nom: string; prenom: string }[] = [];
  enfantSelectionne: number | null = null;
  enfantSelectionneNom = '';

  paiements: any[] = [];
  paiementsUniques: any[] = [];
  paiementsEcheances: any[] = [];

  montantInitial = 0;
  modePaiement = 'unique';
  nombreEcheances = 1;
  echeancesOptions: number[] = [];
  montantTotalAPayer = 0;

  stripe: any;
  cardElement: any;

  enCoursDePaiement = false;
  paiementReussi = false;
  paiementErreur = false;
  erreurMessage = '';

  constructor(
    private http: HttpClient,
    private stripeService: StripeService,
    private parametresService: ParametresPaiementService
  ) {}

  ngOnInit(): void {
    this.parametresService.parametres$.subscribe((parametres) => {
      if (parametres) {
        this.montantInitial = parametres.montantCotisation;
        this.echeancesOptions = Array.from({ length: parametres.echeancesAutorisees }, (_, i) => i + 1);
        this.nombreEcheances = parametres.echeancesAutorisees;
      }
      this.loadEnfants();
    });
  }

  ngAfterViewInit(): void {}

  /** 🔹 Charger les enfants */
  loadEnfants(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<{ id: number; nom: string; prenom: string }[]>(
      'http://localhost:8080/api/membres/mes-enfants',
      { headers: { Authorization: `Bearer ${token}` } }
    ).subscribe({
      next: (data) => {
        this.enfants = data || [];
        if (this.enfants.length === 1) {
          this.selectMembre(this.enfants[0]);
        }
        this.loadPaiements();
      },
      error: (err) => console.error('❌ Erreur chargement enfants', err)
    });
  }

  /** 🔹 Charger les paiements */
  loadPaiements(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<any[]>('http://localhost:8080/api/paiements/parent/mes-paiements', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (data) => {
        this.paiements = (data || []).map(p => ({
          ...p,
          membreId: p.membreId ?? null,
          modePaiement: p.modePaiement === 'carte' ? 'unique' : p.modePaiement,
          echeances: p.echeances || []
        }));
        this.mettreAJourFiltresPaiements();
      },
      error: (err) => console.error("❌ Erreur chargement paiements", err)
    });
  }

  /** 🔹 Mise à jour des filtres */
  mettreAJourFiltresPaiements(): void {
    this.paiementsUniques = this.paiements.filter(p => p.modePaiement === 'unique');
    this.paiementsEcheances = this.paiements.filter(p => p.modePaiement === 'echeances');
  }

  /** 🔹 Filtrer pour affichage HTML */
  getPaiementsUniquesPourEnfant(enfantId: number) {
    return this.paiementsUniques.filter(p => p.membreId === enfantId);
  }
  getPaiementsEcheancesPourEnfant(enfantId: number) {
    return this.paiementsEcheances.filter(p => p.membreId === enfantId);
  }
  genererEcheancierPourEnfant(enfantId: number) {
    const paiement = this.paiementsEcheances.find(p => p.membreId === enfantId);
    return paiement ? paiement.echeances : [];
  }

  /** 🔹 Navigation étapes */
  nextStep(): void {
    if (this.step < this.maxStep) {
      this.step++;
      if (this.step === 3) setTimeout(() => this.initStripeElement(), 200);
    }
  }
  previousStep(): void {
    if (this.step > 1) this.step--;
  }

  /** 🔹 Sélection enfant */
  selectMembre(membre: { id: number; nom: string; prenom: string }): void {
    this.enfantSelectionne = membre.id;
    this.enfantSelectionneNom = `${membre.prenom} ${membre.nom}`;
  }

  /** 🔹 Init Stripe */
  initStripeElement(): void {
    const container = document.querySelector('#card-element');
    if (!container) return;
    this.stripeService.getStripeInstance().then((stripe: any) => {
      this.stripe = stripe;
      const elements = stripe.elements();
      this.cardElement = elements.create('card');
      this.cardElement.mount('#card-element');
    });
  }

  /** 🔹 Paiement principal */
  initierPaiement(): void {
    if (this.enCoursDePaiement || !this.enfantSelectionne || !this.cardElement) return;

    const montant = this.montantInitial;
    const token = localStorage.getItem('token');
    const utilisateurId = Number(localStorage.getItem('utilisateurId'));

    const data = {
      amount: montant,
      currency: 'eur',
      modePaiement: this.modePaiement,
      typePaiement: this.modePaiement === 'unique' ? 'unique' : 'echeances',
      nombreEcheances: this.modePaiement === 'echeances' ? this.nombreEcheances : 1,
      utilisateurId,
      enfantId: this.enfantSelectionne
    };

    this.enCoursDePaiement = true;
    this.http.post('http://localhost:8080/api/stripe/create-payment-intent', data, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        const clientSecret = res?.clientSecret;
        if (!clientSecret) return;
        this.confirmerPaiementStripe(clientSecret, this.cardElement, () => {
          this.loadPaiements(); // 🔹 Rechargement après paiement
          this.paiementReussi = true;
          this.enCoursDePaiement = false;
          this.nextStep();
        });
      },
      error: () => {
        this.erreurMessage = 'Erreur création paiement';
        this.paiementErreur = true;
        this.enCoursDePaiement = false;
      }
    });
  }

  /** 🔹 Confirmation Stripe */
  confirmerPaiementStripe(clientSecret: string, element: any, callback: () => void): void {
    this.stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: element }
    }).then((result: any) => {
      if (result.error) {
        this.erreurMessage = result.error.message;
        this.paiementErreur = true;
      } else {
        callback();
      }
    });
  }

  /** 🔹 Montant par échéance */
  getMontantParEcheance(): number {
    return this.modePaiement === 'echeances' && this.nombreEcheances > 0
      ? this.montantInitial / this.nombreEcheances
      : 0;
  }
}
