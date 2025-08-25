import { Component, OnInit, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StripeService } from '../../services/stripe.service';
import { ParametresPaiementService } from '../../services/parametres-paiement.service';

type TypePaiement = 'UNIQUE' | 'ECHELONNE';

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

  /** ⚠️ NE PAS confondre type ↔ mode ! */
  typeChoisi: TypePaiement = 'UNIQUE'; // 'UNIQUE' ou 'ECHELONNE'
  nombreEcheances = 1;
  echeancesOptions: number[] = [];

  /** Mode de paiement (toujours carte ici) */
  readonly modePaiement = 'CB'; // valeurs back attendues: CB | VIREMENT | ESPECES | CHEQUE

  stripe: any;
  cardElement: any;

  enCoursDePaiement = false;
  paiementReussi = false;
  paiementErreur = false;
  erreurMessage = '';

  /** Pour éviter les doublons */
  paiementIdEnCours: number | null = null;

  constructor(
    private http: HttpClient,
    private stripeService: StripeService,
    private parametresService: ParametresPaiementService
  ) {}

  ngOnInit(): void {
    this.parametresService.parametres$.subscribe((parametres) => {
      if (parametres) {
        this.montantInitial = parametres.montantCotisation;
        const maxEch = Math.max(1, Number(parametres.echeancesAutorisees || 1));
        this.echeancesOptions = Array.from({ length: maxEch }, (_, i) => i + 1);
        this.nombreEcheances = maxEch;
      }
      this.loadEnfants();
    });
  }

  ngAfterViewInit(): void {}

  // =============== Données ===============

  loadEnfants(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<{ id: number; nom: string; prenom: string }[]>(
      '/api/membres/mes-enfants',
      { headers: { Authorization: `Bearer ${token}` } }
    ).subscribe({
      next: (data) => {
        this.enfants = data || [];
        if (this.enfants.length === 1) this.selectMembre(this.enfants[0]);
        this.loadPaiements();
      },
      error: (err) => console.error('[Enfants] Erreur', err)
    });
  }

  loadPaiements(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<any[]>('/api/paiements/parent/mes-paiements', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (data) => {
        // Normalisation côté front (ne PAS tordre les champs)
        this.paiements = (data || []).map(p => ({
          ...p,
          // on suppose p.type ∈ {'UNIQUE','ECHELONNE'}
          type: (p.type || '').toUpperCase(),
          // on suppose p.modePaiement ∈ {'CB','VIREMENT','ESPECES','CHEQUE'}
          modePaiement: (p.modePaiement || '').toUpperCase(),
          membreId: p.membreId ?? null,
          echeances: p.echeances || []
        }));
        this.mettreAJourFiltresPaiements();
      },
      error: (err) => console.error('[Paiements] Erreur', err)
    });
  }

  mettreAJourFiltresPaiements(): void {
    this.paiementsUniques   = this.paiements.filter(p => (p.type || '').toUpperCase() === 'UNIQUE');
    this.paiementsEcheances = this.paiements.filter(p => (p.type || '').toUpperCase() === 'ECHELONNE');
  }

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

  // =============== Navigation ===============

  nextStep(): void {
    this.step++;
    if (this.step === 3) setTimeout(() => this.initStripeElement(), 200);
  }
  previousStep(): void {
    this.step--;
  }

  selectMembre(membre: { id: number; nom: string; prenom: string }): void {
    this.enfantSelectionne = membre.id;
    this.enfantSelectionneNom = `${membre.prenom} ${membre.nom}`;
  }

  // =============== Stripe ===============

  initStripeElement(): void {
    const container = document.querySelector('#card-element');
    if (!container) return;
    this.stripeService.getStripeInstance().then((stripe: any) => {
      this.stripe = stripe;
      const elements = stripe.elements();
      if (this.cardElement) this.cardElement.unmount();
      this.cardElement = elements.create('card');
      this.cardElement.mount('#card-element');
    });
  }

  /**
   * 🔑 NOUVEAU FLUX SANS DOUBLON :
   * 1) Créer le paiement en BDD (statut 'en attente') → renvoie paiementId
   * 2) Créer le PaymentIntent Stripe avec metadata.paiementId
   * 3) Confirmer le paiement carte
   * (le webhook mettra à jour le statut → on NE recrée PAS un paiement après Stripe)
   */
  initierPaiement(): void {
    if (this.enCoursDePaiement || !this.enfantSelectionne || !this.cardElement) return;

    this.enCoursDePaiement = true;
    this.paiementErreur = false;
    this.erreurMessage = '';

    const token = localStorage.getItem('token');
    const utilisateurId = Number(localStorage.getItem('utilisateurId')) || undefined;

    // 1) Créer le paiement en BDD (brouillon)
    const dtoCreation = {
      membreId: this.enfantSelectionne,
      type: this.typeChoisi,              // 'UNIQUE' | 'ECHELONNE'
      modePaiement: this.modePaiement,    // 'CB'
      montantTotal: this.montantInitial,
      nombreEcheances: this.typeChoisi === 'ECHELONNE' ? this.nombreEcheances : 1,
      utilisateurId
    };

    this.http.post<any>('/api/paiements/parent/ajouter', dtoCreation, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (creationRes) => {
        const paiementId = creationRes?.id || creationRes?.paiementId;
        this.paiementIdEnCours = paiementId ?? null;

        // 2) Créer le PaymentIntent Stripe avec metadata.paiementId
const dataPI = {
  amount: this.montantInitial,
  currency: 'eur',
  paiementId: this.paiementIdEnCours,
  typePaiement: this.typeChoisi,
  nombreEcheances: dtoCreation.nombreEcheances,
  utilisateurId,
  enfantId: this.enfantSelectionne,
  modePaiement: this.modePaiement, // ✅ clé attendue côté back actuel
  mode: this.modePaiement           // ✅ garde aussi celle-ci si tu as déjà mis à jour le contrôleur
};
        this.http.post<any>('/api/stripe/create-payment-intent', dataPI, {
          headers: { Authorization: `Bearer ${token}` }
        }).subscribe({
          next: (resPI) => {
            const clientSecret = resPI?.clientSecret;
            if (!clientSecret) {
              this.failPaiement('Client secret Stripe manquant');
              return;
            }
            this.confirmerPaiementStripe(clientSecret);
          },
          error: (errPI) => this.failPaiement('Erreur création PaymentIntent Stripe', errPI)
        });
      },
      error: (err) => this.failPaiement('Erreur création du paiement en BDD', err)
    });
  }

  private confirmerPaiementStripe(clientSecret: string): void {
    this.stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: this.cardElement }
    }).then((result: any) => {
      if (result.error) {
        this.failPaiement(result.error.message || 'Erreur de paiement');
      } else {
        // ✅ Succès : le webhook Stripe mettra le paiement à jour en 'payé'
        this.paiementReussi = true;
        this.enCoursDePaiement = false;
        this.step = 4;
        // Rafraîchir l’historique
        this.loadPaiements();
      }
    }).catch((e: any) => this.failPaiement('Exception lors de la confirmation Stripe', e));
  }

  private failPaiement(msg: string, err?: any) {
    console.error('❌', msg, err || '');
    this.erreurMessage = msg;
    this.paiementErreur = true;
    this.enCoursDePaiement = false;
  }

  // =============== Aide ===============

  getMontantParEcheance(): number {
    return this.typeChoisi === 'ECHELONNE' && this.nombreEcheances > 0
      ? this.montantInitial / this.nombreEcheances
      : 0;
  }
}
