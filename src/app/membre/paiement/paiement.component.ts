import { Component, OnInit, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StripeService } from '../../services/stripe.service';
import { ParametresPaiementService } from '../../services/parametres-paiement.service';
import { MembreService } from '../../services/membre.service';

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

  montantInitial: number = 0;
  modePaiement: 'unique' | 'echeances' = 'unique';
  nombreEcheances: number = 1;
  echeancesOptions: number[] = [];

  stripe: any;
  cardElement: any;
  cardElementModal: any;

  modalOuverte: boolean = false;
  paiementActuel: any = null;
  echeanceEnCours: any = null;
  montantTotalAPayer: number = 0;

  enCoursDePaiement: boolean = false;
  paiementReussi: boolean = false;
  paiementErreur: boolean = false;
  erreurMessage: string = '';

  step: number = 1;
  maxStep: number = 3;

  sectionOuverte: { [key: string]: boolean } = { unique: true, echeances: true };

  utilisateurId: number = 0;
  membreId: number = 0;

  constructor(
    private http: HttpClient,
    private stripeService: StripeService,
    private parametresService: ParametresPaiementService,
    private membreService: MembreService
  ) {}

  ngOnInit(): void {
    // Charger paramètres de paiement
    this.parametresService.parametres$.subscribe((parametres) => {
      if (parametres) {
        this.montantInitial = parametres.montantCotisation;
        this.echeancesOptions = Array.from(
          { length: parametres.echeancesAutorisees },
          (_, i) => i + 1
        );
      }
    });

    // Charger infos utilisateur depuis localStorage (objet complet)
    const utilisateur = JSON.parse(localStorage.getItem('utilisateur') || '{}');
    this.utilisateurId = utilisateur?.id || 0;

    // Récupérer le membre "connecté"
    this.membreService.getMembreConnecte().subscribe({
      next: (membre) => {
        if (membre?.id) {
          this.membreId = membre.id;
          localStorage.setItem('membreId', String(this.membreId));
          console.log('✅ Membre trouvé :', this.membreId);
          this.loadPaiements();
        } else {
          this.erreurMessage = 'Aucun membre trouvé pour cet utilisateur.';
          this.paiementErreur = true;
          console.error('❌ Aucun membre trouvé pour cet utilisateur');
        }
      },
      error: (err) => {
        console.error('❌ Erreur récupération membre connecté :', err);
        this.erreurMessage = 'Impossible de récupérer votre profil membre.';
        this.paiementErreur = true;
      }
    });
  }

  ngAfterViewInit(): void {}

  // Helpers de normalisation pour l’API backend
  private toTypePaiementBack(mode: 'unique' | 'echeances'): 'UNIQUE' | 'ECHELONNE' {
    return mode === 'echeances' ? 'ECHELONNE' : 'UNIQUE';
  }
  private toModePaiementBack(): 'stripe' {
    // on force Stripe côté front (ton backend peut normaliser en 'CB' s’il veut)
    return 'stripe';
  }

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
        const elements = this.stripe.elements();
        this.cardElement = elements.create('card');
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
    const membreId = Number(localStorage.getItem('membreId'));

    if (!token || !membreId) {
      console.error('❌ Token ou membreId manquant');
      return;
    }

    this.http.get<any[]>('/api/paiements', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (data) => {
        // Garder uniquement les paiements du membre connecté
        this.paiements = (Array.isArray(data) ? data : [])
          .filter(p => p?.membreId === membreId)
          .map(p => ({
            ...p,
            echeances: p.echeances || []
          }));

        this.mettreAJourFiltresPaiements();
      },
      error: (err) => {
        console.error('❌ Erreur lors du chargement des paiements :', err);
      }
    });
  }

  mettreAJourFiltresPaiements(): void {
    // On se base sur p.type (UNIQUE / ECHELONNE) renvoyé par le backend
    this.paiementsUniques = this.paiements.filter(p => String(p?.type ?? '').toUpperCase() === 'UNIQUE');
    this.paiementsEcheances = this.paiements.filter(p => String(p?.type ?? '').toUpperCase() === 'ECHELONNE');
  }

  nextStep(): void {
    if (this.step < this.maxStep) {
      this.step++;
      if (this.step === 2) {
        this.montantTotalAPayer = this.montantInitial;
        setTimeout(() => this.initStripeElement(), 200);
      }
    }
  }

  previousStep(): void {
    if (this.step > 1) this.step--;
  }

  initierPaiement(): void {
    if (this.enCoursDePaiement) return;

    const montant = this.montantInitial;
    if (montant <= 0 || !this.cardElement) {
      console.error('Erreur : montant invalide ou Stripe non chargé.', montant, this.cardElement);
      alert('Erreur : montant invalide ou Stripe non chargé.');
      return;
    }
    this.montantTotalAPayer = montant;

    const token = localStorage.getItem('token');
    if (!token) {
      this.erreurMessage = 'Utilisateur non authentifié';
      this.paiementErreur = true;
      console.error('Erreur : utilisateur non authentifié');
      return;
    }

    // nombreEcheances doit être un number côté backend
    const nb = this.modePaiement === 'echeances' ? Number(this.nombreEcheances) : undefined;

    const payload: any = {
      amount: montant,
      currency: 'eur',
      modePaiement: this.toModePaiementBack(),                 // 'stripe'
      typePaiement: this.toTypePaiementBack(this.modePaiement),// 'UNIQUE' | 'ECHELONNE'
      utilisateurId: this.utilisateurId,
      membreId: this.membreId
    };
    if (nb && !Number.isNaN(nb)) payload.nombreEcheances = nb;

    console.log('initierPaiement - token:', token);
    console.log('initierPaiement - utilisateurId:', this.utilisateurId);
    console.log('initierPaiement - membreId:', this.membreId);
    console.log('initierPaiement - data envoyé au backend:', payload);

    this.enCoursDePaiement = true;
    this.paiementErreur = false;
    this.paiementReussi = false;

    this.http.post('/api/stripe/create-payment-intent', payload, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        const clientSecret = res?.clientSecret;
        if (!clientSecret) {
          this.erreurMessage = 'Erreur : clientSecret non reçu.';
          this.paiementErreur = true;
          this.enCoursDePaiement = false;
          console.error('Erreur : clientSecret non reçu', res);
          return;
        }
        this.confirmerPaiementStripe(clientSecret, this.cardElement, () => {
          this.loadPaiements();
          this.paiementReussi = true;
          this.enCoursDePaiement = false;
          this.step = 3;
          console.log('Paiement réussi, passage à l’étape 3');
        });
      },
      error: (err) => {
        this.erreurMessage = err?.error?.message || 'Erreur lors de la création du paiement.';
        this.paiementErreur = true;
        this.enCoursDePaiement = false;
        console.error('Erreur lors de la création du paiement :', err);
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

  ouvrirModalPaiement(paiement: any, echeance: any): void {
    if (!paiement || !echeance || String(echeance?.statut ?? '').toLowerCase() === 'payé') {
      console.error('Erreur : cette échéance ne peut pas être payée.');
      return;
    }

    console.log("Ouverture de la modale pour l'échéance :", echeance);

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

  // ⚠️ NOTE : ton endpoint /api/paiements/{id}/payer-echeance est @PreAuthorize('ADMIN')
  // Si tu veux que les MEMBRE paient une échéance, il vaut mieux passer par Stripe (create-payment-intent)
  // et traiter le marquage "payé" côté webhook. On laisse ici ton appel existant si tu l’utilises en admin.
  payerEcheances(): void {
    if (!this.echeanceEnCours || !this.cardElementModal) {
      alert('Erreur : informations manquantes.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      this.erreurMessage = 'Authentification requise.';
      this.paiementErreur = true;
      return;
    }

    const data = [{ id: this.echeanceEnCours.id, montant: this.echeanceEnCours.montant }];

    this.enCoursDePaiement = true;

    this.http.post(`/api/paiements/${this.paiementActuel.id}/payer-echeance`, data, {
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

  toggleSection(section: 'unique' | 'echeances'): void {
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

  fermerModale(): void {
    this.paiementReussi = false;
    this.paiementErreur = false;
    this.erreurMessage = '';
  }

  genererEcheancier(paiement: any): any[] {
    return paiement.echeances || [];
  }

  calculerMontantRestant(paiement: any): number {
    if (!paiement.echeances || paiement.echeances.length === 0) return paiement.montantTotal;

    const montantPaye = paiement.echeances
      .filter((e: any) => String(e?.statut ?? '').toLowerCase() === 'payé')
      .reduce((total: number, e: any) => total + (e.montant || 0), 0);

    return (paiement.montantTotal || 0) - montantPaye;
  }
}
