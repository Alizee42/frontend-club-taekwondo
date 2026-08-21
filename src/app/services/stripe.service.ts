// src/app/services/stripe.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  loadStripe,
  Stripe,
  StripeCardElement,
  StripeElements,
} from '@stripe/stripe-js';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

type CreatePiPayload = {
  paiementId: number;
  echeanceId?: number;
  customerEmail?: string;
  sendReceiptEmail?: boolean;
};

type CreatePiResponse = {
  clientSecret: string;
  paymentIntentId?: string;
  stripeAccountId?: string | null;
  [k: string]: any;
};

@Injectable({ providedIn: 'root' })
export class StripeService {
  private readonly backendUrl = `${environment.apiUrl}/stripe`;

  // Une instance Stripe.js par compte connecte (cle = stripeAccountId, ou 'platform'
  // pour le compte partage) : confirmer un paiement cree en charge directe sur le
  // compte d'un club exige une instance Stripe.js chargee avec { stripeAccount }.
  private stripeInstances = new Map<string, Stripe>();
  private currentStripeAccountId: string | null = null;
  private elements: StripeElements | null = null;
  private publicKeyPromise: Promise<string> | null = null;

  public cardElement: StripeCardElement | null = null;
  public clientSecret: string | null = null;

  constructor(private http: HttpClient) {}

  // ---------- INIT Stripe ----------

  private getMeta(name: string): string | null {
    const el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
    return el?.content || null;
  }

  /** Recupere et met en cache la cle publique Stripe */
  private getPublicKey(): Promise<string> {
    if (!this.publicKeyPromise) {
      this.publicKeyPromise = (async () => {
        try {
          const r = await firstValueFrom(this.http.get<any>(`${this.backendUrl}/public-key`));
          const k = r?.publicKey ?? r?.key ?? r?.stripePublicKey;
          if (k) return k;
        } catch {
          // handled below with a more actionable message
        }

        let diagnostic =
          'Le backend Stripe ne semble pas demarre avec le profil local ' +
          '(SPRING_PROFILES_ACTIVE=local) ou les cles Stripe sont absentes.';

        try {
          const status = await firstValueFrom(
            this.http.get<any>(`${this.backendUrl}/config-status`)
          );
          const publishableKeyConfigured = !!status?.publishableKeyConfigured;
          const secretKeyConfigured = !!status?.secretKeyConfigured;

          diagnostic =
            'Verification recommandee: /api/stripe/config-status ' +
            `(publishableKeyConfigured=${publishableKeyConfigured}, ` +
            `secretKeyConfigured=${secretKeyConfigured}). ` +
            'En local, demarrez le backend avec SPRING_PROFILES_ACTIVE=local.';
        } catch {
          diagnostic +=
            ' Verifiez aussi que http://localhost:8080/api/stripe/config-status est accessible.';
        }

        throw new Error(`Cle publique Stripe introuvable (public-key). ${diagnostic}`);
      })();
    }
    return this.publicKeyPromise;
  }

  /**
   * @param stripeAccountId compte Stripe connecte a utiliser (charge directe sur le
   *   compte d'un club). Si omis, reutilise le dernier compte renvoye par
   *   createPaymentIntent() ; si aucun, utilise le compte plateforme partage.
   */
  async ensureStripe(stripeAccountId?: string | null): Promise<Stripe> {
    const accountId = stripeAccountId !== undefined ? stripeAccountId : this.currentStripeAccountId;
    const cacheKey = accountId ?? 'platform';

    const cached = this.stripeInstances.get(cacheKey);
    if (cached) return cached;

    const pk = await this.getPublicKey();
    const stripe = accountId
      ? await loadStripe(pk, { stripeAccount: accountId })
      : await loadStripe(pk);
    if (!stripe) throw new Error('Stripe non initialise (cle publique invalide ?)');
    this.stripeInstances.set(cacheKey, stripe);
    return stripe;
  }

  getStripeInstance(stripeAccountId?: string | null): Promise<Stripe> {
    return this.ensureStripe(stripeAccountId);
  }

  // ---------- API BACKEND ----------

  /** Cree (ou reutilise) un PaymentIntent cote backend */
  async createPaymentIntent(paiementData: CreatePiPayload): Promise<CreatePiResponse> {
    if (!paiementData?.paiementId) {
      throw new Error(
        'createPaymentIntent: "paiementId" est requis. ' +
        'Cree la commande pour obtenir un paiementId avant d initier le paiement.'
      );
    }

    const res = await firstValueFrom(
      this.http.post<CreatePiResponse>(`${this.backendUrl}/create-payment-intent`, paiementData)
    );

    this.clientSecret = res?.clientSecret || null;
    this.currentStripeAccountId = res?.stripeAccountId ?? null;
    return res;
  }

  // ---------- STRIPE ELEMENTS ----------

  async monterElementDans(selector: string, stripeAccountId?: string | null): Promise<void> {
    // Le futur confirmerPaiement() doit utiliser la MEME instance Stripe.js que celle
    // qui a monte cet element carte (un Element n'est valide que pour l'instance dont
    // il provient) : on memorise donc explicitement le compte utilise ici.
    if (stripeAccountId !== undefined) {
      this.currentStripeAccountId = stripeAccountId;
    }
    const stripe = await this.ensureStripe(stripeAccountId);

    this.elements = stripe.elements({ locale: 'fr' });

    if (this.cardElement) {
      try {
        this.cardElement.unmount();
      } catch {}
      this.cardElement = null;
    }

    const card = this.elements.create('card', { hidePostalCode: true });
    card.mount(selector);
    this.cardElement = card;

    card.on('change', (event) => {
      if (event.error) console.error('[Stripe] Erreur saisie:', event.error.message);
    });
  }

  unmount(): void {
    if (this.cardElement) {
      try {
        this.cardElement.unmount();
      } catch {}
      this.cardElement = null;
    }
    this.elements = null;
  }

  setClientSecret(clientSecret: string | null): void {
    this.clientSecret = clientSecret;
  }

  /** Synchronise l etat d un PaymentIntent avec la BDD */
  async syncPayment(paymentIntentId: string): Promise<any> {
    return firstValueFrom(
      this.http.post<any>(`${this.backendUrl}/sync-payment`, { paymentIntentId })
    );
  }

  /** Recupere l URL du recu Stripe pour un paiement */
  async getReceiptUrl(paiementId: number): Promise<string | null> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ receiptUrl: string }>(`${this.backendUrl}/receipt/${paiementId}`)
      );
      return res?.receiptUrl ?? null;
    } catch {
      return null;
    }
  }

  async confirmerPaiement(): Promise<{
    success: boolean;
    status?: string;
    paymentIntentId?: string;
    message?: string;
  }> {
    const stripe = await this.ensureStripe(this.currentStripeAccountId);
    if (!this.cardElement) return { success: false, message: 'Element carte non monte' };
    if (!this.clientSecret) return { success: false, message: 'Client secret manquant' };

    const result = await stripe.confirmCardPayment(this.clientSecret, {
      payment_method: { card: this.cardElement },
    });

    if (result.error) {
      return { success: false, message: result.error.message || 'Paiement refuse' };
    }

    const pi = result.paymentIntent;
    const status = pi?.status;

    if (status === 'succeeded' || status === 'processing') {
      return { success: true, status, paymentIntentId: pi?.id };
    }
    if (status === 'requires_action') {
      return { success: false, status, message: 'Action supplementaire requise.' };
    }
    return { success: false, status, message: 'Paiement non confirme.' };
  }
}
