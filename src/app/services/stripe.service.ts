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
  [k: string]: any;
};

@Injectable({ providedIn: 'root' })
export class StripeService {
  private readonly backendUrl = `${environment.apiUrl}/stripe`;

  private stripe: Stripe | null = null;
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

  /** Récupère et met en cache la clé publique Stripe */
  private getPublicKey(): Promise<string> {
    if (!this.publicKeyPromise) {
      this.publicKeyPromise = (async () => {
        // Utiliser uniquement l'endpoint public clé Stripe
        try {
          const r = await firstValueFrom(this.http.get<any>(`${this.backendUrl}/public-key`));
          const k = r?.publicKey ?? r?.key ?? r?.stripePublicKey;
          if (k) return k;
        } catch { /* ignore */ }

        throw new Error('Clé publique Stripe introuvable (public-key).');
      })();
    }
    return this.publicKeyPromise;
  }

  async ensureStripe(): Promise<Stripe> {
    if (this.stripe) return this.stripe;
    const pk = await this.getPublicKey();
    const stripe = await loadStripe(pk);
    if (!stripe) throw new Error('Stripe non initialisé (clé publique invalide ?)');
    this.stripe = stripe;
    return stripe;
  }

  getStripeInstance(): Promise<Stripe> {
    return this.ensureStripe();
  }

  // ---------- API BACKEND ----------

  /** Crée (ou réutilise) un PaymentIntent côté backend */
  async createPaymentIntent(paiementData: CreatePiPayload): Promise<CreatePiResponse> {
    if (!paiementData?.paiementId) {
      throw new Error(
        'createPaymentIntent: "paiementId" est requis. ' +
        'Crée la commande pour obtenir un paiementId avant d’initier le paiement.'
      );
    }

    const res = await firstValueFrom(
      this.http.post<CreatePiResponse>(`${this.backendUrl}/create-payment-intent`, paiementData)
    );

    this.clientSecret = res?.clientSecret || null;
    return res;
  }

  // ---------- STRIPE ELEMENTS ----------

  async monterElementDans(selector: string): Promise<void> {
    const stripe = await this.ensureStripe();

    this.elements = stripe.elements({ locale: 'fr' });

    if (this.cardElement) {
      try { this.cardElement.unmount(); } catch {}
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
      try { this.cardElement.unmount(); } catch {}
      this.cardElement = null;
    }
    this.elements = null;
  }

  setClientSecret(clientSecret: string | null): void {
    this.clientSecret = clientSecret;
  }

  /** Synchronise l'état d'un PaymentIntent avec la BDD */
  async syncPayment(paymentIntentId: string): Promise<any> {
    return firstValueFrom(
      this.http.post<any>(`${this.backendUrl}/sync-payment`, { paymentIntentId })
    );
  }

  /** Récupère l'URL du reçu Stripe pour un paiement */
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
    const stripe = await this.ensureStripe();
    if (!this.cardElement) return { success: false, message: 'Élément carte non monté' };
    if (!this.clientSecret) return { success: false, message: 'Client secret manquant' };

    const result = await stripe.confirmCardPayment(this.clientSecret, {
      payment_method: { card: this.cardElement },
    });

    if (result.error) {
      return { success: false, message: result.error.message || 'Paiement refusé' };
    }

    const pi = result.paymentIntent;
    const status = pi?.status;

    if (status === 'succeeded' || status === 'processing') {
      return { success: true, status, paymentIntentId: pi?.id };
    }
    if (status === 'requires_action') {
      return { success: false, status, message: 'Action supplémentaire requise.' };
    }
    return { success: false, status, message: 'Paiement non confirmé.' };
  }
}