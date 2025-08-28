import { Component, OnInit, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
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
  private readonly API = '/api';

  // Données
  paiements: any[] = [];
  paiementsUniques: any[] = [];
  paiementsEcheances: any[] = [];

  // Paramètres paiement
  montantInitial = 0;
  modePaiement: 'unique' | 'echeances' = 'unique';
  nombreEcheances = 1;
  echeancesOptions: number[] = [];

  // Stripe
  stripe: any;
  cardElement: any;
  cardElementModal: any;
  private lastPaymentIntentId: string | null = null;

  // Modale échéance
  modalOuverte = false;
  paiementActuel: any = null;
  echeanceEnCours: any = null;
  montantTotalAPayer = 0;

  // États
  enCoursDePaiement = false;
  paiementReussi = false;
  paiementErreur = false;
  erreurMessage = '';
  private confirming = false; // ← anti double-clic / double confirm

  // Wizard
  step = 1;
  maxStep = 3;

  // UI
  sectionOuverte: { [key: string]: boolean } = { unique: true, echeances: true };

  // Identifiants
  utilisateurId = 0;
  membreId = 0;

  constructor(
    private http: HttpClient,
    private stripeService: StripeService,
    private parametresService: ParametresPaiementService,
    private membreService: MembreService
  ) {}

  // ===================== Lifecycle =====================
  ngOnInit(): void {
    this.parametresService.parametres$.subscribe((p) => {
      if (p) {
        this.montantInitial = Number(p.montantCotisation || 0);
        const maxEch = Math.max(1, Number(p.echeancesAutorisees || 1));
        this.echeancesOptions = Array.from({ length: maxEch }, (_, i) => i + 1);
      }
    });

    const utilisateur = JSON.parse(localStorage.getItem('utilisateur') || '{}');
    this.utilisateurId = utilisateur?.id || 0;

    this.membreService.getMembreConnecte().subscribe({
      next: (membre) => {
        if (membre?.id) {
          this.membreId = membre.id;
          localStorage.setItem('membreId', String(this.membreId));
          this.loadPaiements();
        } else {
          this.fail('Aucun membre trouvé pour cet utilisateur.');
        }
      },
      error: (err) => {
        console.error('❌ [Membre] Erreur récupération membre :', err);
        this.fail('Impossible de récupérer votre profil membre.');
      }
    });
  }

  ngAfterViewInit(): void {
    // Stripe monté à l’étape 2 / dans la modale
  }

  // ===================== Utils =====================
  private authHeaders() {
    const token = localStorage.getItem('token') || '';
    return { Authorization: `Bearer ${token}` };
  }

  private log(where: string, payload?: any) {
    console.log(`[Membre][${where}]`, payload ?? '');
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
    return { display: 'en attente', css: 'badge-en-attente' };
  }

  private extractPiIdFromClientSecret(clientSecret?: string | null): string | null {
    if (!clientSecret) return null;
    const idx = clientSecret.indexOf('_secret_');
    return idx > 0 ? clientSecret.substring(0, idx) : null;
  }

  /** Appel de sync qui se purge pour ne jamais rejouer le même PI */
  private async syncPaymentIntentOnce(): Promise<void> {
    if (!this.lastPaymentIntentId) return;
    const pi = this.lastPaymentIntentId;
    this.lastPaymentIntentId = null; // purge d’abord
    try {
      await firstValueFrom(
        this.http.post(
          `${this.API}/stripe/sync-payment`,
          { paymentIntentId: pi },
          { headers: this.authHeaders() }
        )
      );
      this.log('sync-payment.ok', pi);
    } catch (e) {
      this.log('sync-payment.err', e);
      // ignoré en dev si endpoint absent; le webhook fera la mise à jour
    }
  }

  private fail(msg: string, err?: any) {
    console.error('❌', msg, err || '');
    this.erreurMessage = msg;
    this.paiementErreur = true;
    this.enCoursDePaiement = false;
    this.confirming = false;
  }

  // ===================== Chargements =====================
  loadPaiements(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<any[]>(`${this.API}/paiements`, { headers: this.authHeaders() })
      .subscribe({
        next: (data) => {
          const mapped = (Array.isArray(data) ? data : []).map((p: any) => {
            const utilisateurId = Number(p?.utilisateurId ?? p?.utilisateur?.id ?? NaN);
            const membreId = Number(
              p?.membreId ??
              p?.membre?.id ??
              p?.beneficiaireId ??
              p?.enfantId ??
              NaN
            );

            let type = this.norm(p?.type ?? p?.typePaiement);
            if (!type) {
              type = Array.isArray(p?.echeances) && p.echeances.length > 0 ? 'ECHELONNE' : 'UNIQUE';
            }

            const statut = this.mapStatut(p?.statut);
            const mode = this.norm(p?.modePaiement ?? p?.mode);

            const echeances = Array.isArray(p?.echeances)
              ? p.echeances.map((e: any) => {
                  const eStatut = this.mapStatut(e?.statut);
                  const dateEcheance = e?.dateEcheance ?? e?.date ?? null;
                  return {
                    ...e,
                    dateEcheance,
                    dateAffichable: dateEcheance ? new Date(dateEcheance) : null,
                    statutDisplay: eStatut.display,
                    statutCss: eStatut.css
                  };
                }).sort((a: any, b: any) => (a.numero ?? 0) - (b.numero ?? 0))
              : [];

            return {
              ...p,
              utilisateurId,
              membreId,
              type,
              modePaiement: mode,
              statutDisplay: statut.display,
              statutCss: statut.css,
              echeances
            };
          });

          const membreIdLS = Number(localStorage.getItem('membreId'));
          this.paiements = mapped.filter(p =>
            Number(p.utilisateurId) === this.utilisateurId ||
            Number(p.membreId) === membreIdLS
          );

          this.paiementsUniques   = this.paiements.filter(p => p.type === 'UNIQUE');
          this.paiementsEcheances = this.paiements.filter(p => p.type.startsWith('ECHEL'));

          this.log('loadPaiements.done', {
            uniques: this.paiementsUniques.length,
            echeances: this.paiementsEcheances.length
          });
        },
        error: (err) => console.error('❌ [Paiements] Erreur:', err)
      });
  }

  // Affichage compact
  nextUnpaid(paiement: any) {
    const list = Array.isArray(paiement?.echeances) ? paiement.echeances : [];
    return list.find((e: any) => e?.statutCss !== 'badge-payé') || null;
  }

  // ===================== Stripe Elements =====================
  initStripeElement(): void {
    const container = document.querySelector('#card-element');
    if (!container) return;

    this.stripeService.getStripeInstance().then((stripe: any) => {
      this.stripe = stripe;
      const elements = stripe.elements();
      if (this.cardElement) { try { this.cardElement.unmount(); } catch {} }
      this.cardElement = elements.create('card');
      this.cardElement.mount('#card-element');
      this.log('stripe.card.mounted');
    });
  }

  initStripeElementModal(): void {
    const container = document.querySelector('#card-element-modal');
    if (!container) return;

    this.stripeService.getStripeInstance().then((stripe: any) => {
      this.stripe = stripe;
      const elements = stripe.elements();
      if (this.cardElementModal) { try { this.cardElementModal.unmount(); } catch {} }
      this.cardElementModal = elements.create('card');
      this.cardElementModal.mount('#card-element-modal');
      this.log('stripe.card.modal.mounted');
    });
  }

  // ===================== Wizard =====================
  nextStep(): void {
    if (this.step < this.maxStep) {
      this.step++;
      if (this.step === 2) {
        this.montantTotalAPayer = this.getMontantParEcheance(); // affichage logique
        setTimeout(() => this.initStripeElement(), 200);
      }
    }
  }
  previousStep(): void {
    if (this.step > 1) this.step--;
  }

  // ===================== Création Paiement (idempotent front) =====================
  private getLSKeyPaiement(): string {
    return `paiementIdEnCours:${this.membreId}`;
  }

  private toTypePaiementBack(mode: 'unique' | 'echeances'): 'UNIQUE' | 'ECHELONNE' {
    return mode === 'echeances' ? 'ECHELONNE' : 'UNIQUE';
  }
  private toModePaiementBack(): 'CB' { return 'CB'; }

  private creerPaiementBdd(montant: number): Promise<number> {
    const token = localStorage.getItem('token') || '';
    if (!token) return Promise.reject('Non authentifié');

    const lsKey = this.getLSKeyPaiement();
    const deja = localStorage.getItem(lsKey);
    if (deja) {
      const idReutilise = Number(deja);
      this.log('bdd.reuse', idReutilise);
      return Promise.resolve(idReutilise);
    }

    const payload = {
      montantTotal: montant,
      type: this.toTypePaiementBack(this.modePaiement),
      modePaiement: this.toModePaiementBack(),
      membreId: this.membreId,
      utilisateurId: this.utilisateurId,
      nombreEcheances: this.modePaiement === 'echeances' ? Number(this.nombreEcheances) : null
    };
    this.log('bdd.create.payload', payload);

    return new Promise((resolve, reject) => {
      this.http.post<any>(`${this.API}/paiements/ajouter-membre`, payload, {
        headers: this.authHeaders()
      }).subscribe({
        next: (res) => {
          const paiementId =
            res?.paiementId ?? res?.id ?? res?.paiement?.id ?? (Array.isArray(res) ? res[0]?.id : null);
          this.log('bdd.create.res', res);
          if (!paiementId) return reject('ID paiement non retourné');
          localStorage.setItem(lsKey, String(paiementId));
          resolve(Number(paiementId));
        },
        error: (err) => reject(err?.error?.error || err?.error?.message || 'Erreur création paiement')
      });
    });
  }

  private demarrerIntentStripe(paiementId: number, echeanceId?: number): Promise<string> {
    const token = localStorage.getItem('token') || '';
    if (!token) return Promise.reject('Non authentifié');

    const payload: any = { paiementId };
    if (echeanceId) payload.echeanceId = echeanceId; // ✅ cible une échéance
    this.log('pi.create.payload', payload);

    return new Promise((resolve, reject) => {
      this.http.post<any>(`${this.API}/stripe/create-payment-intent`, payload, {
        headers: this.authHeaders()
      }).subscribe({
        next: (res) => {
          this.log('pi.create.res', res);
          const clientSecret = res?.clientSecret;
          if (!clientSecret) return reject('clientSecret non reçu');
          // mémorise l’ID du PI (renvoyé ou extrait)
          this.lastPaymentIntentId = res?.paymentIntentId || this.extractPiIdFromClientSecret(clientSecret);
          resolve(clientSecret);
        },
        error: (err) => reject(err?.error?.error || err?.error?.message || 'Erreur Stripe')
      });
    });
  }

  initierPaiement(): void {
    if (this.enCoursDePaiement || this.confirming) return;

    const montant = this.getMontantParEcheance(); // cohérent avec l’écran
    if (montant <= 0 || !this.cardElement) {
      alert('Erreur : montant invalide ou Stripe non chargé.');
      return;
    }

    this.enCoursDePaiement = true;
    this.confirming = true;
    this.paiementErreur = false;
    this.paiementReussi = false;
    this.montantTotalAPayer = montant;

    const lsKey = this.getLSKeyPaiement();
    const savedId = localStorage.getItem(lsKey);
    const idPromise = savedId ? Promise.resolve(Number(savedId)) : this.creerPaiementBdd(this.montantInitial);

    idPromise
      .then((paiementId) => this.demarrerIntentStripe(paiementId)) // le back choisit la 1ʳᵉ échéance impayée
      .then((clientSecret) => {
        this.log('stripe.confirm.start');
        return this.stripe.confirmCardPayment(clientSecret, {
          payment_method: { card: this.cardElement, billing_details: { name: 'Nom du client' } }
        });
      })
      .then(async (result: any) => {
        this.enCoursDePaiement = false;
        this.confirming = false;

        this.log('stripe.confirm.result', result);
        if (result?.error) {
          this.fail(result.error.message || 'Erreur de paiement Stripe');
          return;
        }
        // Fallback dev local si le webhook ne touche pas ton back
        await this.syncPaymentIntentOnce();
        // succès → purge l’ID brouillon pour éviter doublons
        localStorage.removeItem(lsKey);
        this.loadPaiements();
        this.paiementReussi = true;
        this.step = 3;
      })
      .catch((err) => this.fail(String(err)));
  }

  clearPaiementEnCours(): void {
    const lsKey = this.getLSKeyPaiement();
    localStorage.removeItem(lsKey);
    this.log('bdd.id.clear', lsKey);
  }

  // ===================== Paiement d’échéance (modale) =====================
  ouvrirModalPaiement(paiement: any, echeance: any): void {
    if (!paiement || !echeance) return;
    if ((echeance?.statutCss || '') === 'badge-payé') return; // ✅ check fiable

    this.paiementActuel = paiement;
    this.echeanceEnCours = echeance;
    this.montantTotalAPayer = Number(echeance?.montant || 0);
    this.modalOuverte = true;

    if (this.cardElementModal) {
      try { this.cardElementModal.unmount(); } catch {}
      this.cardElementModal = null;
    }
    setTimeout(() => this.initStripeElementModal(), 250);
  }

  fermerModalPaiement(): void {
    this.modalOuverte = false;
    this.paiementActuel = null;
    this.echeanceEnCours = null;
    if (this.cardElementModal) {
      try { this.cardElementModal.unmount(); } catch {}
      this.cardElementModal = null;
    }
  }

  payerEcheances(): void {
    if (this.enCoursDePaiement || this.confirming) return;
    if (!this.paiementActuel || !this.cardElementModal || !this.echeanceEnCours) {
      alert('Informations manquantes pour payer cette échéance.');
      return;
    }

    this.enCoursDePaiement = true;
    this.confirming = true;
    this.paiementErreur = false;
    this.erreurMessage = '';

    const paiementId = Number(this.paiementActuel?.id || this.paiementActuel?.paiementId);
    const echeanceId = Number(this.echeanceEnCours?.id);

    this.demarrerIntentStripe(paiementId, echeanceId) // ✅ cible explicitement l’échéance
      .then((clientSecret) => {
        this.log('stripe.confirm.modal.start');
        return this.stripe.confirmCardPayment(clientSecret, {
          payment_method: { card: this.cardElementModal, billing_details: { name: 'Nom du payeur' } }
        });
      })
      .then(async (result: any) => {
        this.enCoursDePaiement = false;
        this.confirming = false;

        this.log('stripe.confirm.modal.result', result);
        if (result?.error) {
          this.fail(result.error.message || 'Erreur de paiement Stripe');
          return;
        }

        await this.syncPaymentIntentOnce();   // ✅ se purge
        this.fermerModalPaiement();
        this.loadPaiements();
        this.paiementReussi = true;
      })
      .catch((err) => this.fail(String(err)));
  }

  // ===================== UI helpers =====================
  toggleSection(section: 'unique' | 'echeances'): void {
    this.sectionOuverte[section] = !this.sectionOuverte[section];
  }

  getMontantTotalEcheances(): number {
    return this.montantInitial;
  }

  getMontantParEcheance(): number {
    return this.modePaiement === 'echeances' && this.nombreEcheances > 0
      ? this.montantInitial / this.nombreEcheances
      : this.montantInitial; // en "unique", montant complet
  }

  fermerModale(): void {
    this.paiementReussi = false;
    this.paiementErreur = false;
    this.erreurMessage = '';
  }

  genererEcheancier(paiement: any): any[] {
    return Array.isArray(paiement?.echeances) ? paiement.echeances : [];
  }

  calculerMontantRestant(paiement: any): number {
    if (!Array.isArray(paiement?.echeances) || paiement.echeances.length === 0) {
      return Number(paiement?.montantTotal || 0);
    }
    const montantPaye = paiement.echeances
      .filter((e: any) => (e?.statutCss || '') === 'badge-payé')
      .reduce((sum: number, e: any) => sum + Number(e?.montant || 0), 0);
    return Math.max(0, Number(paiement?.montantTotal || 0) - montantPaye);
  }
}
