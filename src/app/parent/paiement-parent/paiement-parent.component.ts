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
  private readonly API = '/api';

  // Wizard
  step = 1;
  maxStep = 4;

  // Enfants
  enfants: { id: number; nom: string; prenom: string }[] = [];
  enfantSelectionne: number | null = null;
  enfantSelectionneNom = '';

  // Historique paiements
  paiements: any[] = [];
  paiementsUniques: any[] = [];
  paiementsEcheances: any[] = [];

  // Paramètres
  montantInitial = 0;
  typeChoisi: TypePaiement = 'UNIQUE'; // UNIQUE | ECHELONNE
  nombreEcheances = 1;
  echeancesOptions: number[] = [];
  readonly modePaiement = 'CB'; // CB | VIREMENT | ESPECES | CHEQUE (ici CB)

  // Stripe
  stripe: any;
  cardElement: any;
  cardElementParentModal: any;

  // États paiement
  enCoursDePaiement = false;
  paiementReussi = false;
  paiementErreur = false;
  erreurMessage = '';

  // Id pour éviter les doublons lors de la création d’un Paiement
  paiementIdEnCours: number | null = null;

  // Modal échéance (parent)
  modalOuverte = false;
  paiementActuel: any = null;
  echeanceEnCours: any = null;
  montantTotalAPayer = 0;

  constructor(
    private http: HttpClient,
    private stripeService: StripeService,
    private parametresService: ParametresPaiementService
  ) {}

  // ===================== Lifecycle =====================
  ngOnInit(): void {
    // paramètres (service gère route admin/public + fallback)
    this.parametresService.parametres$.subscribe((p) => {
      if (p) {
        this.montantInitial = Number(p.montantCotisation || 0);
        const maxEch = Math.max(1, Number(p.echeancesAutorisees || 1));
        this.echeancesOptions = Array.from({ length: maxEch }, (_, i) => i + 1);
        this.nombreEcheances = this.typeChoisi === 'ECHELONNE' ? maxEch : 1;
      }
      // ensuite on charge les enfants + paiements
      this.loadEnfants();
    });
  }

  ngAfterViewInit(): void {
    // rien ici (on monte Stripe à l’étape 3 / dans la modale)
  }

  // ===================== Utils =====================
  private authHeaders() {
    const token = localStorage.getItem('token') || '';
    return { Authorization: `Bearer ${token}` };
  }

  private normalizeStatut(raw: any) {
    // robustesse : enlève accents / casse
    const s = String(raw ?? '')
      .normalize('NFD').replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim();

    if (s === 'paye' || s === 'payé' || s === 'payee' || s === 'payée') {
      return { statutDisplay: 'payé', statutCss: 'badge-payé' };
    }
    if (s === 'annule' || s === 'annulé') {
      return { statutDisplay: 'annulé', statutCss: 'badge-annulé' };
    }
    // par défaut
    return { statutDisplay: 'en attente', statutCss: 'badge-en-attente' };
  }

  // ===================== Chargements =====================
  loadEnfants(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<{ id: number; nom: string; prenom: string }[]>(
      `${this.API}/membres/mes-enfants`,
      { headers: this.authHeaders() }
    ).subscribe({
      next: (data) => {
        this.enfants = data || [];
        if (this.enfants.length === 1) {
          this.selectMembre(this.enfants[0]);
        }
        this.loadPaiements();
      },
      error: (err) => console.error('❌ [Enfants] Erreur:', err)
    });
  }

  loadPaiements(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<any[]>(`${this.API}/paiements/parent/mes-paiements`, {
      headers: this.authHeaders()
    }).subscribe({
      next: (data) => {
        // Normalisation minimaliste (ne PAS tordre les champs côté front)
        this.paiements = (data || []).map(p => {
          const type = String(p?.type ?? '').toUpperCase();
          const mode = String(p?.modePaiement ?? p?.mode ?? '').toUpperCase();
          const { statutDisplay, statutCss } = this.normalizeStatut(p?.statut);

          // map échéances (date + statuts normalisés)
          const echeances = Array.isArray(p?.echeances) ? p.echeances.map((e: any) => {
            const { statutDisplay: eDisp, statutCss: eCss } = this.normalizeStatut(e?.statut);
            return {
              ...e,
              dateAffichable: new Date(e?.dateEcheance ?? e?.date ?? Date.now()),
              statutDisplay: eDisp,
              statutCss: eCss
            };
          }) : [];

          return {
            ...p,
            type,
            modePaiement: mode,
            statutDisplay,
            statutCss,
            echeances
          };
        });

        this.mettreAJourFiltresPaiements();
      },
      error: (err) => console.error('❌ [Paiements] Erreur:', err)
    });
  }

  mettreAJourFiltresPaiements(): void {
    this.paiementsUniques   = this.paiements.filter(p => p.type === 'UNIQUE');
    this.paiementsEcheances = this.paiements.filter(p => p.type === 'ECHELONNE');
  }

  // ===================== Sélecteurs / helpers vue =====================
  getPaiementsUniquesPourEnfant(enfantId: number) {
    return this.paiementsUniques.filter(p => p.membreId === enfantId);
  }

  getPaiementsEcheancesPourEnfant(enfantId: number) {
    return this.paiementsEcheances.filter(p => p.membreId === enfantId);
  }

  genererEcheancier(paiement: any): any[] {
    return Array.isArray(paiement?.echeances) ? paiement.echeances : [];
  }

  calculerMontantRestant(paiement: any): number {
    if (!Array.isArray(paiement?.echeances) || paiement.echeances.length === 0) {
      return Number(paiement?.montantTotal || 0);
    }
    const paye = paiement.echeances
      .filter((e: any) => (e?.statutCss || '') === 'badge-payé')
      .reduce((sum: number, e: any) => sum + Number(e?.montant || 0), 0);
    return Math.max(0, Number(paiement?.montantTotal || 0) - paye);
  }

  // ===================== Wizard =====================
  nextStep(): void {
    if (this.step < this.maxStep) {
      this.step++;
      if (this.step === 3) {
        setTimeout(() => this.initStripeElement(), 200);
      }
    }
  }

  previousStep(): void {
    if (this.step > 1) this.step--;
  }

  selectMembre(membre: { id: number; nom: string; prenom: string }): void {
    this.enfantSelectionne = membre.id;
    this.enfantSelectionneNom = `${membre.prenom} ${membre.nom}`;
  }

  // ===================== Stripe Elements (écran principal) =====================
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

  // ===================== Création Paiement (parent) =====================
  /**
   * 1) Crée le Paiement en BDD (brouillon) → retourne paiementId
   * 2) Crée un PaymentIntent Stripe (metadata.paiementId) via /api/stripe/create-payment-intent
   * 3) Confirme le paiement (Stripe.js)
   * (Webhooks Stripe mettront à jour le statut en BDD)
   */
  initierPaiement(): void {
    if (this.enCoursDePaiement || !this.enfantSelectionne || !this.cardElement) return;

    this.enCoursDePaiement = true;
    this.paiementErreur = false;
    this.erreurMessage = '';

    const token = localStorage.getItem('token') || '';
    const utilisateurId = Number(localStorage.getItem('utilisateurId')) || undefined;

    const dtoCreation = {
      membreId: this.enfantSelectionne,
      type: this.typeChoisi,                 // 'UNIQUE' | 'ECHELONNE'
      modePaiement: this.modePaiement,       // 'CB'
      montantTotal: this.montantInitial,
      nombreEcheances: this.typeChoisi === 'ECHELONNE' ? this.nombreEcheances : 1,
      utilisateurId
    };

    // 1) Création BDD
    this.http.post<any>(`${this.API}/paiements/parent/ajouter`, dtoCreation, {
      headers: this.authHeaders()
    }).subscribe({
      next: (creationRes) => {
        const paiementId = creationRes?.id ?? creationRes?.paiementId;
        if (!paiementId) {
          this.failPaiement('ID de paiement introuvable après création');
          return;
        }
        this.paiementIdEnCours = Number(paiementId);

        // 2) PaymentIntent (le back calcule le montant selon type / première échéance impayée)
        this.http.post<any>(`${this.API}/stripe/create-payment-intent`, {
          paiementId: this.paiementIdEnCours,
          // infos additionnelles en metadata (optionnel côté back)
          typePaiement: this.typeChoisi,
          nombreEcheances: dtoCreation.nombreEcheances,
          utilisateurId,
          enfantId: this.enfantSelectionne,
          modePaiement: this.modePaiement
        }, { headers: this.authHeaders() }).subscribe({
          next: (resPI) => {
            const clientSecret = resPI?.clientSecret;
            if (!clientSecret) {
              this.failPaiement('Client secret Stripe manquant');
              return;
            }
            // 3) Confirmation carte
            this.stripe.confirmCardPayment(clientSecret, {
              payment_method: { card: this.cardElement }
            }).then((result: any) => {
              if (result?.error) {
                this.failPaiement(result.error.message || 'Erreur de paiement');
              } else {
                this.paiementReussi = true;
                this.enCoursDePaiement = false;
                this.step = 4;
                this.loadPaiements();
              }
            }).catch((e: any) => this.failPaiement('Exception lors de la confirmation Stripe', e));
          },
          error: (errPI) => this.failPaiement('Erreur création PaymentIntent Stripe', errPI)
        });
      },
      error: (err) => this.failPaiement('Erreur création du paiement en BDD', err)
    });
  }

  private failPaiement(msg: string, err?: any) {
    console.error('❌', msg, err || '');
    this.erreurMessage = msg;
    this.paiementErreur = true;
    this.enCoursDePaiement = false;
  }

  // ===================== Paiement d’échéance (parent) =====================
  ouvrirModalPaiement(paiement: any, echeance: any): void {
    if (!paiement || !echeance) return;

    // pas de paiement si déjà payé
    if ((echeance?.statutCss || '') === 'badge-payé') return;

    this.paiementActuel = paiement;
    this.echeanceEnCours = echeance;
    this.montantTotalAPayer = Number(echeance?.montant || 0);
    this.modalOuverte = true;

    // Monte le Stripe Element dans la modale
    setTimeout(() => this.initStripeElementParentModal(), 200);
  }

  fermerModalPaiement(): void {
    this.modalOuverte = false;
    this.paiementActuel = null;
    this.echeanceEnCours = null;
    this.montantTotalAPayer = 0;

    if (this.cardElementParentModal) {
      this.cardElementParentModal.unmount();
      this.cardElementParentModal = null;
    }
  }

  private initStripeElementParentModal(): void {
    const container = document.querySelector('#card-element-parent-modal');
    if (!container) return;

    this.stripeService.getStripeInstance().then((stripe: any) => {
      this.stripe = stripe;
      const elements = stripe.elements();
      if (this.cardElementParentModal) this.cardElementParentModal.unmount();
      this.cardElementParentModal = elements.create('card');
      this.cardElementParentModal.mount('#card-element-parent-modal');
    });
  }

  /**
   * ⚠️ Parent : on n’utilise PAS l’endpoint admin /payer-echeance.
   * On crée un PaymentIntent pour le paiement existant (paiementId).
   * Le back choisit la 1ʳᵉ échéance impayée et calcule le montant.
   */
  payerEcheances(): void {
    if (!this.paiementActuel || !this.cardElementParentModal) return;

    this.enCoursDePaiement = true;
    this.paiementErreur = false;
    this.erreurMessage = '';

    const token = localStorage.getItem('token') || '';
    const paiementId = Number(this.paiementActuel?.id || this.paiementActuel?.paiementId);

    this.http.post<any>(`${this.API}/stripe/create-payment-intent`, {
      paiementId
      // (optionnel) on pourrait envoyer enfantId, utilisateurId, etc.
    }, { headers: this.authHeaders() }).subscribe({
      next: (resPI) => {
        const clientSecret = resPI?.clientSecret;
        if (!clientSecret) {
          this.failPaiement('Client secret Stripe manquant');
          return;
        }
        this.stripe.confirmCardPayment(clientSecret, {
          payment_method: { card: this.cardElementParentModal }
        }).then((result: any) => {
          this.enCoursDePaiement = false;
          if (result?.error) {
            this.paiementErreur = true;
            this.erreurMessage = result.error.message || 'Erreur de paiement';
            return;
          }
          // OK
          this.paiementReussi = true;
          this.fermerModalPaiement();
          this.loadPaiements();
        }).catch((e: any) => this.failPaiement('Exception lors de la confirmation Stripe', e));
      },
      error: (err) => this.failPaiement('Erreur création PaymentIntent Stripe', err)
    });
  }

  // ===================== Aides =====================
  getMontantParEcheance(): number {
    return this.typeChoisi === 'ECHELONNE' && this.nombreEcheances > 0
      ? this.montantInitial / this.nombreEcheances
      : this.montantInitial;
  }
}
