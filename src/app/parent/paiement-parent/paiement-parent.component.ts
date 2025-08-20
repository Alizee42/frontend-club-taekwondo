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
    console.log("🔄 [INIT] Chargement des paramètres de paiement...");
    this.parametresService.parametres$.subscribe((parametres) => {
      if (parametres) {
        console.log("✅ [Paramètres] Reçus :", parametres);
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
    if (!token) {
      console.warn("⚠️ [Enfants] Aucun token trouvé");
      return;
    }

    console.log("📥 [Enfants] Chargement depuis API /mes-enfants ...");

    this.http.get<{ id: number; nom: string; prenom: string }[]>(
      '/api/membres/mes-enfants',
      { headers: { Authorization: `Bearer ${token}` } }
    ).subscribe({
      next: (data) => {
        console.log("✅ [Enfants] Données reçues :", data);
        this.enfants = data || [];
        if (this.enfants.length === 1) {
          this.selectMembre(this.enfants[0]);
        }
        this.loadPaiements();
      },
      error: (err) => console.error('❌ [Enfants] Erreur chargement', err)
    });
  }

  /** 🔹 Charger les paiements */
  loadPaiements(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn("⚠️ [Paiements] Aucun token trouvé");
      return;
    }

    console.log("📥 [Paiements] Chargement depuis API /parent/mes-paiements ...");

    this.http.get<any[]>('/api/paiements/parent/mes-paiements', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (data) => {
        console.log("✅ [Paiements] Données reçues :", data);
        this.paiements = (data || []).map(p => ({
          ...p,
          membreId: p.membreId ?? null,
          modePaiement: p.modePaiement === 'carte' ? 'unique' : p.modePaiement,
          echeances: p.echeances || []
        }));
        this.mettreAJourFiltresPaiements();
      },
      error: (err) => console.error("❌ [Paiements] Erreur chargement", err)
    });
  }

  /** 🔹 Mise à jour des filtres */
  mettreAJourFiltresPaiements(): void {
    console.log("📊 [Paiements] Mise à jour des filtres...");
    this.paiementsUniques = this.paiements.filter(p => p.modePaiement === 'unique');
    this.paiementsEcheances = this.paiements.filter(p => p.modePaiement === 'echeances');
    console.log("📊 [Paiements] Uniques :", this.paiementsUniques);
    console.log("📊 [Paiements] Échelonnés :", this.paiementsEcheances);
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
    this.step++;
    console.log("➡️ [Navigation] Passage à l'étape", this.step);
    if (this.step === 3) setTimeout(() => this.initStripeElement(), 200);
  }
  previousStep(): void {
    this.step--;
    console.log("⬅️ [Navigation] Retour à l'étape", this.step);
  }

  /** 🔹 Sélection enfant */
  selectMembre(membre: { id: number; nom: string; prenom: string }): void {
    console.log("👦 [Sélection enfant]", membre);
    this.enfantSelectionne = membre.id;
    this.enfantSelectionneNom = `${membre.prenom} ${membre.nom}`;
  }

  /** 🔹 Init Stripe */
  initStripeElement(): void {
    console.log("💳 [Stripe] Initialisation de l'élément de carte...");
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

    console.log("🚀 [Paiement] Initialisation paiement Stripe...");

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

    console.log("📤 [Stripe] Données envoyées au backend :", data);

    this.enCoursDePaiement = true;
    this.http.post('/api/stripe/create-payment-intent', data, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        console.log("✅ [Stripe] clientSecret reçu :", res);
        const clientSecret = res?.clientSecret;
        if (!clientSecret) return;
        this.confirmerPaiementStripe(clientSecret, this.cardElement, () => {
          this.paiementReussi = true;
          this.enCoursDePaiement = false;
          this.nextStep();
        });
      },
      error: (err) => {
        console.error("❌ [Stripe] Erreur création paiement :", err);
        this.erreurMessage = 'Erreur création paiement';
        this.paiementErreur = true;
        this.enCoursDePaiement = false;
      }
    });
  }

  /** 🔹 Confirmation Stripe */
  confirmerPaiementStripe(clientSecret: string, element: any, callback: () => void): void {
    console.log("🔑 [Stripe] Confirmation paiement...");
    this.stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: element }
    }).then((result: any) => {
      if (result.error) {
        console.error("❌ [Stripe] Erreur de paiement :", result.error.message);
        this.erreurMessage = result.error.message;
        this.paiementErreur = true;
      } else {
        console.log("✅ [Stripe] Paiement validé :", result);
        // ✅ Paiement Stripe OK → enregistrer en BDD
        this.enregistrerPaiementBDD(() => {
          callback();
        });
      }
    });
  }

  /** 🔹 Enregistrement du paiement en BDD */
  enregistrerPaiementBDD(callback: () => void): void {
    const token = localStorage.getItem('token');
    if (!token || !this.enfantSelectionne) {
      console.warn("⚠️ [Paiement BDD] Token ou enfant non défini !");
      return;
    }

    const paiementDTO = {
      membreId: this.enfantSelectionne,
      type: 'cotisation',
      modePaiement: this.modePaiement,
      montantTotal: this.montantInitial
    };

    console.log("📤 [Paiement BDD] Envoi au backend :", paiementDTO);

    this.http.post('/api/paiements/parent/ajouter', paiementDTO, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res) => {
        console.log("✅ [Paiement BDD] Sauvegardé en BDD :", res);
        this.loadPaiements();
        callback();
      },
      error: (err) => {
        console.error('❌ [Paiement BDD] Erreur sauvegarde', err);
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
