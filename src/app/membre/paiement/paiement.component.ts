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
  /** Base API (ajuste ici si besoin) */
  private readonly API = '/api';

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

  // -----------------------------
  // Lifecycle
  // -----------------------------
  ngOnInit(): void {
    console.log('🟢 [PaiementComponent] Init');

    // Paramètres de paiement (le service gère un fallback si le GET sécurisé échoue)
    this.parametresService.parametres$.subscribe((parametres) => {
      console.log('📥 [Params] Reçus:', parametres);
      if (parametres) {
        this.montantInitial = parametres.montantCotisation;
        this.echeancesOptions = Array.from(
          { length: parametres.echeancesAutorisees },
          (_, i) => i + 1
        );
        console.log('✅ [Params] montantInitial:', this.montantInitial, 'echeancesOptions:', this.echeancesOptions);
      }
    });

    // Données locales
    const utilisateur = JSON.parse(localStorage.getItem('utilisateur') || '{}');
    this.utilisateurId = utilisateur?.id || 0;
    console.log('👤 [LocalStorage] utilisateurId:', this.utilisateurId);

    // Membre connecté
    this.membreService.getMembreConnecte().subscribe({
      next: (membre) => {
        console.log('📥 [Membre] Réponse:', membre);
        if (membre?.id) {
          this.membreId = membre.id;
          localStorage.setItem('membreId', String(this.membreId));
          console.log('✅ [Membre] Id:', this.membreId, '(stocké localStorage)');
          this.loadPaiements();
        } else {
          this.erreurMessage = 'Aucun membre trouvé pour cet utilisateur.';
          this.paiementErreur = true;
          console.error('❌ [Membre] Aucun membre trouvé');
        }
      },
      error: (err) => {
        console.error('❌ [Membre] Erreur récupération membre connecté :', err);
        this.erreurMessage = 'Impossible de récupérer votre profil membre.';
        this.paiementErreur = true;
      }
    });
  }

  ngAfterViewInit(): void {
    console.log('ℹ️ [AfterViewInit]');
  }

  // -----------------------------
  // Helpers backend
  // -----------------------------
  private toTypePaiementBack(mode: 'unique' | 'echeances'): 'UNIQUE' | 'ECHELONNE' {
    return mode === 'echeances' ? 'ECHELONNE' : 'UNIQUE';
  }
  private toModePaiementBack(): 'CB' { return 'CB'; }

  private getLSKeyPaiement(): string {
    return `paiementIdEnCours:${this.membreId}`;
  }

  private norm(val: any): string {
    return String(val ?? '')
      .normalize('NFD').replace(/\p{Diacritic}/gu, '')
      .toUpperCase().trim();
  }

  private mapStatut(s: any): { display: string; css: string } {
    const t = this.norm(s);
    if (t.includes('PAYE')) return { display: 'payé', css: 'badge-payé' };
    if (t.includes('ANNUL')) return { display: 'annulé', css: 'badge-annulé' };
    // EN_ATTENTE / PENDING / EN ATTENTE…
    return { display: 'en attente', css: 'badge-en-attente' };
  }

  // -----------------------------
  // Stripe Elements
  // -----------------------------
  initStripeElement(): void {
    console.log('🧩 [Stripe] initStripeElement()');
    setTimeout(() => {
      const container = document.querySelector('#card-element');
      if (!container) {
        console.warn('⚠️ [Stripe] #card-element introuvable');
        return;
      }

      if (!this.stripe) {
        this.stripeService.getStripeInstance().then((stripe: any) => {
          this.stripe = stripe;
          const elements = stripe.elements();
          this.cardElement = elements.create('card');
          this.cardElement.mount('#card-element');
          console.log('✅ [Stripe] Card element monté');
        });
      } else {
        const elements = this.stripe.elements();
        this.cardElement = elements.create('card');
        this.cardElement.mount('#card-element');
        console.log('✅ [Stripe] Card element monté (instance existante)');
      }
    }, 0);
  }

  initStripeElementModal(): void {
    console.log('🧩 [Stripe] initStripeElementModal()');
    const container = document.querySelector('#card-element-modal');
    if (!container) {
      console.warn('⚠️ [Stripe] #card-element-modal introuvable');
      return;
    }

    if (!this.stripe) {
      this.stripeService.getStripeInstance().then((stripe: any) => {
        this.stripe = stripe;
        const elements = stripe.elements();
        this.cardElementModal = elements.create('card');
        this.cardElementModal.mount('#card-element-modal');
        console.log('✅ [Stripe] Card element modal monté');
      });
    } else {
      const elements = this.stripe.elements();
      this.cardElementModal = elements.create('card');
      this.cardElementModal.mount('#card-element-modal');
      console.log('✅ [Stripe] Card element modal monté (instance existante)');
    }
  }

  // -----------------------------
  // Chargement historique
  // -----------------------------
  loadPaiements(): void {
    console.log('📡 [Paiements] Chargement…');
    const token = localStorage.getItem('token');
    const membreIdLS = Number(localStorage.getItem('membreId'));

    if (!token) {
      console.error('❌ [Paiements] Token manquant');
      return;
    }

    this.http.get<any[]>(`${this.API}/paiements`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (data) => {
        console.log('✅ [Paiements] Réponse backend:', data);

        // Normalisation large pour couvrir tous les cas de DTO
        const mapped = (Array.isArray(data) ? data : []).map((p: any) => {
          const utilisateurId = Number(p?.utilisateurId ?? p?.utilisateur?.id ?? NaN);
          const membreId = Number(
            p?.membreId ??
            p?.membre?.id ??
            p?.beneficiaireId ?? // compat éventuelle
            p?.enfantId ??
            NaN
          );

          const typeRaw = p?.type ?? p?.typePaiement;
          let type = this.norm(typeRaw);
          if (!type) {
            // fallback: s'il y a des échéances, considère ECHELONNE
            type = Array.isArray(p?.echeances) && p.echeances.length > 0 ? 'ECHELONNE' : 'UNIQUE';
          }

          const statut = this.mapStatut(p?.statut);
          const mode = this.norm(p?.modePaiement ?? p?.mode);

          // date "affichable" pour la ligne de paiement
          const dateAffichable =
            (p?.datePaiement ? new Date(p.datePaiement) : null) ??
            (p?.dateCreation ? new Date(p.dateCreation) : null) ??
            null;

          // map échéances → garantir dateEcheance + dateAffichable + statutDisplay/css
          const echeances = Array.isArray(p?.echeances)
            ? p.echeances.map((e: any) => {
                const eStatut = this.mapStatut(e?.statut);
                const dateEcheance = e?.dateEcheance ?? e?.date ?? null;
                const dateAffichableE = dateEcheance ? new Date(dateEcheance) : null;
                return {
                  ...e,
                  dateEcheance,
                  dateAffichable: dateAffichableE,
                  statutDisplay: eStatut.display,
                  statutCss: eStatut.css
                };
              })
            : [];

          return {
            ...p,
            utilisateurId,
            membreId,
            type,
            modePaiement: mode,
            dateAffichable,
            statutDisplay: statut.display,
            statutCss: statut.css,
            echeances
          };
        });

        // IMPORTANT : on garde les paiements du user connecté
        this.paiements = mapped.filter(p =>
          Number(p.utilisateurId) === this.utilisateurId ||
          Number(p.membreId) === membreIdLS
        );

        this.mettreAJourFiltresPaiements();
      },
      error: (err) => {
        console.error('❌ [Paiements] Erreur lors du chargement :', err);
      }
    });
  }

  mettreAJourFiltresPaiements(): void {
    this.paiementsUniques   = this.paiements.filter(p => p.type === 'UNIQUE');
    this.paiementsEcheances = this.paiements.filter(p => p.type.startsWith('ECHEL'));
    console.log('📊 [Paiements] Répartition:', {
      uniques: this.paiementsUniques.length,
      echeances: this.paiementsEcheances.length
    });
  }

  // -----------------------------
  // Wizard
  // -----------------------------
  nextStep(): void {
    if (this.step < this.maxStep) {
      this.step++;
      console.log('➡️ [Wizard] Étape ->', this.step);
      if (this.step === 2) {
        this.montantTotalAPayer = this.montantInitial;
        setTimeout(() => this.initStripeElement(), 200);
      }
    }
  }

  previousStep(): void {
    if (this.step > 1) {
      this.step--;
      console.log('⬅️ [Wizard] Étape ->', this.step);
    }
  }

  // -----------------------------
  // Création Paiement (idempotent côté front)
  // -----------------------------
  /** Étape 1 : créer (ou réutiliser) un Paiement en BDD via la route MEMBRE sécurisée */
  private creerPaiementBdd(montant: number): Promise<number> {
    const token = localStorage.getItem('token') || '';
    if (!token) {
      console.error('❌ [BDD] Pas de token pour créer le paiement en BDD');
      return Promise.reject('Non authentifié');
    }

    const lsKey = this.getLSKeyPaiement();
    const deja = localStorage.getItem(lsKey);
    if (deja) {
      const idReutilise = Number(deja);
      console.log('♻️ [BDD] Réutilisation paiementId en cours depuis localStorage ->', idReutilise);
      return Promise.resolve(idReutilise);
    }

    const payloadBdd: any = {
      montantTotal: montant,                                   // euros
      type: this.toTypePaiementBack(this.modePaiement),        // 'UNIQUE' | 'ECHELONNE'
      modePaiement: this.toModePaiementBack(),                 // 'CB'
      membreId: this.membreId,                                 // le serveur vérifiera avec le JWT
      utilisateurId: this.utilisateurId,                       // ignoré côté serveur si inutile
      nombreEcheances: this.modePaiement === 'echeances' ? Number(this.nombreEcheances) : null
    };

    console.log('📦 [BDD] Création Paiement ->', payloadBdd);

    return new Promise((resolve, reject) => {
      this.http.post<any>(`${this.API}/paiements/ajouter-membre`, payloadBdd, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({
        next: (res) => {
          const paiementId =
            res?.paiementId ??
            res?.id ??
            res?.paiement?.id ??
            (Array.isArray(res) ? res[0]?.id : null);

          console.log('✅ [BDD] Paiement créé (ajouter-membre), id =', paiementId, 'réponse =', res);
          if (!paiementId) {
            return reject('ID paiement non retourné par le backend');
          }
          // 🔒 Idempotence front : on mémorise l’ID tant que non soldé
          localStorage.setItem(lsKey, String(paiementId));
          resolve(Number(paiementId));
        },
        error: (err) => {
          console.error('❌ [BDD] Erreur création paiement (ajouter-membre) :', err);
          reject(err?.error?.error || err?.error?.message || 'Erreur création paiement');
        }
      });
    });
  }

  /** Étape 2 : demander le PaymentIntent Stripe avec { paiementId } */
  private demarrerIntentStripe(paiementId: number): Promise<string> {
    const token = localStorage.getItem('token') || '';
    if (!token) {
      console.error('❌ [Stripe] Pas de token pour create-payment-intent');
      return Promise.reject('Non authentifié');
    }

    console.log('📡 [Stripe] POST', `${this.API}/stripe/create-payment-intent`, '->', { paiementId });

    return new Promise((resolve, reject) => {
      this.http.post<any>(`${this.API}/stripe/create-payment-intent`, { paiementId }, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({
        next: (res) => {
          console.log('✅ [Stripe] Réponse:', res);
          const clientSecret = res?.clientSecret;
          if (!clientSecret) {
            console.error('❌ [Stripe] clientSecret manquant');
            return reject('clientSecret non reçu');
          }
          resolve(clientSecret);
        },
        error: (err) => {
          console.error('❌ [Stripe] Erreur create-payment-intent:', err);
          reject(err?.error?.error || err?.error?.message || 'Erreur Stripe');
        }
      });
    });
  }

  /** Étape 3 : chaîne complète (BDD -> Stripe -> Confirmation) */
  initierPaiement(): void {
    console.log('🟢 [Paiement] initierPaiement()');
    if (this.enCoursDePaiement) return;

    const montant = this.montantInitial;
    if (montant <= 0 || !this.cardElement) {
      console.error('❌ [Paiement] Montant invalide ou Stripe non chargé.', { montant, cardElement: !!this.cardElement });
      alert('Erreur : montant invalide ou Stripe non chargé.');
      return;
    }

    this.enCoursDePaiement = true;
    this.paiementErreur = false;
    this.paiementReussi = false;
    this.montantTotalAPayer = montant;

    const lsKey = this.getLSKeyPaiement();
    const savedId = localStorage.getItem(lsKey);
    const idPromise = savedId ? Promise.resolve(Number(savedId)) : this.creerPaiementBdd(montant);

    idPromise
      .then((paiementId) => this.demarrerIntentStripe(paiementId))
      .then((clientSecret) => {
        console.log('📡 [Stripe] confirmCardPayment…');
        return this.stripe.confirmCardPayment(clientSecret, {
          payment_method: { card: this.cardElement, billing_details: { name: 'Nom du client' } }
        });
      })
      .then((result: any) => {
        this.enCoursDePaiement = false;
        if (result?.error) {
          console.error('❌ [Stripe] confirmCardPayment error:', result.error);
          this.erreurMessage = result.error.message || 'Erreur de paiement Stripe';
          this.paiementErreur = true;
          // ⚠️ On garde l’ID en local pour pouvoir relancer sans recréer
          return;
        }
        console.log('🎉 [Paiement] Confirmé par Stripe');
        // ✅ Paiement OK → purge l’ID en cours pour éviter les doublons futurs
        localStorage.removeItem(lsKey);
        this.loadPaiements();
        this.paiementReussi = true;
        this.step = 3;
      })
      .catch((err) => {
        console.error('❌ [Paiement] échec du flux:', err);
        this.erreurMessage = String(err);
        this.paiementErreur = true;
        this.enCoursDePaiement = false;
      });
  }

  /** Purge manuelle de l’ID en cours (si bloqué) */
  clearPaiementEnCours(): void {
    const lsKey = this.getLSKeyPaiement();
    localStorage.removeItem(lsKey);
    console.log('🧹 [Paiement] paiementIdEnCours purgé pour membre', this.membreId);
  }

  // -----------------------------
  // Modal échéance (admin-only endpoint côté serveur)
  // -----------------------------
  confirmerPaiementStripe(clientSecret: string, element: any, callback: () => void): void {
    console.log('📡 [Stripe] confirmCardPayment, clientSecret:', clientSecret);
    this.stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: element, billing_details: { name: 'Nom du client' } }
    }).then((result: any) => {
      this.enCoursDePaiement = false;
      if (result.error) {
        console.error('❌ [Stripe] confirmCardPayment error:', result.error);
        this.erreurMessage = result.error.message;
        this.paiementErreur = true;
      } else {
        console.log('✅ [Stripe] Paiement confirmé');
        callback();
      }
    });
  }

  ouvrirModalPaiement(paiement: any, echeance: any): void {
    if (!paiement || !echeance || String(echeance?.statutDisplay ?? '').toLowerCase() === 'payé') {
      console.error('❌ [Modal] Échéance non payable', { paiement, echeance });
      return;
    }

    console.log('🪟 [Modal] Ouverture pour échéance:', echeance);

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
    console.log('🪟 [Modal] Fermeture');
    this.modalOuverte = false;
    this.paiementActuel = null;
    this.echeanceEnCours = null;

    if (this.cardElementModal) {
      this.cardElementModal.unmount();
      this.cardElementModal = null;
    }
  }

  // NOTE : /api/paiements/{id}/payer-echeance est @PreAuthorize('ADMIN')
payerEcheances(): void {
  console.log('🟢 [Echéance] payerEcheances()');

  if (!this.echeanceEnCours || !this.cardElementModal) {
    console.error('❌ [Echéance] Informations manquantes.', { echeance: this.echeanceEnCours, card: !!this.cardElementModal });
    alert('Erreur : informations manquantes.');
    return;
  }

  const token = localStorage.getItem('token');
  if (!token) {
    this.erreurMessage = 'Authentification requise.';
    this.paiementErreur = true;
    console.error('❌ [Echéance] Pas de token');
    return;
  }

  this.enCoursDePaiement = true;
  this.paiementErreur = false;
  this.erreurMessage = '';

  // 1) Demande un client_secret pour la prochaine échéance impayée de ce paiement
  this.demarrerIntentStripe(this.paiementActuel.id)
    .then((clientSecret) => {
      console.log('📡 [Stripe] confirmCardPayment (échéance)…');
      // 2) Confirmation Stripe sur l’élément de la modale
      return this.stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: this.cardElementModal, billing_details: { name: 'Nom du payeur' } }
      });
    })
    .then((result: any) => {
      this.enCoursDePaiement = false;

      if (result?.error) {
        console.error('❌ [Stripe] confirmCardPayment error:', result.error);
        this.erreurMessage = result.error.message || 'Erreur de paiement Stripe';
        this.paiementErreur = true;
        return;
      }

      console.log('🎉 [Echéance] Paiement confirmé par Stripe');
      this.fermerModalPaiement();   // ferme la modale
      this.loadPaiements();         // recharge la liste
      this.paiementReussi = true;
    })
    .catch((err) => {
      this.enCoursDePaiement = false;
      console.error('❌ [Echéance] échec du flux:', err);
      this.erreurMessage = String(err);
      this.paiementErreur = true;
    });
}

  // -----------------------------
  // UI helpers
  // -----------------------------
  toggleSection(section: 'unique' | 'echeances'): void {
    this.sectionOuverte[section] = !this.sectionOuverte[section];
    console.log('🗂️ [Historique] Toggle section:', section, '->', this.sectionOuverte[section] ? 'ouvert' : 'fermé');
  }

  getMontantTotalEcheances(): number {
    return this.montantInitial;
  }

  getMontantParEcheance(): number {
    const val = this.modePaiement === 'echeances' && this.nombreEcheances > 0
      ? this.montantInitial / this.nombreEcheances
      : 0;
    return val;
  }

  fermerModale(): void {
    console.log('ℹ️ [UI] fermerModale -> reset états erreur/succès');
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
      .filter((e: any) => String(e?.statutDisplay ?? '').toLowerCase() === 'payé')
      .reduce((total: number, e: any) => total + (e.montant || 0), 0);
    const restant = (paiement.montantTotal || 0) - montantPaye;
    return restant;
  }
}
