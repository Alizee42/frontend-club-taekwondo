// src/app/services/stripe.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
  loadStripe,
  Stripe,
  StripeCardElement,
  StripeElements,
} from '@stripe/stripe-js';
import { firstValueFrom } from 'rxjs';

type CreatePiPayload = {
  paiementId: number;
  echeanceId?: number;
  customerEmail?: string;
};

type CreatePiResponse = {
  clientSecret: string;
  paymentIntentId?: string;
  [k: string]: any;
};

@Injectable({ providedIn: 'root' })
export class StripeService {
  private readonly backendUrl = '/api/stripe';

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

  /**
   * Récupère et met en cache la clé publique Stripe.
   * Ordre: /api/stripe/public-key -> /api/parametres-paiement (admin) -> /public -> <meta>.
   */
  private getPublicKey(): Promise<string> {
    if (!this.publicKeyPromise) {
      this.publicKeyPromise = (async () => {
        // 0) endpoint public clé Stripe (recommandé)
        try {
          const r = await firstValueFrom(this.http.get<any>(`${this.backendUrl}/public-key`));
          const k = r?.publicKey ?? r?.key ?? r?.stripePublicKey;
          if (k) return k;
        } catch { /* 204/404/401 -> fallbacks */ }

        // 1) paramètres admin (peut nécessiter auth)
        try {
          const admin = await firstValueFrom(
            this.http.get<any>('/api/parametres-paiement', { headers: this.getAuthHeaders() })
          );
          const k = admin?.stripePublicKey ?? admin?.clePubliqueStripe ?? admin?.publishableKey ?? admin?.stripe_pk;
          if (k) return k;
        } catch { /* ignore */ }

        // 2) paramètres publics
        try {
          const pub = await firstValueFrom(this.http.get<any>('/api/parametres-paiement/public'));
          const k = pub?.stripePublicKey ?? pub?.clePubliqueStripe ?? pub?.publishableKey ?? pub?.stripe_pk;
          if (k) return k;
        } catch { /* ignore */ }

        // 3) meta fallback (dev)
        const metaKey =
          this.getMeta('stripe-public-key') ||
          this.getMeta('stripePublicKey')   ||
          this.getMeta('stripe-pk')         ||
          this.getMeta('stripe_pk');
        if (metaKey) return metaKey;

        throw new Error('Clé publique Stripe introuvable (public-key / paramètres / meta).');
      })();
    }
    return this.publicKeyPromise;
  }

  /** Initialise Stripe une fois, puis réutilise l'instance */
  async ensureStripe(): Promise<Stripe> {
    if (this.stripe) return this.stripe;
    const pk = await this.getPublicKey();
    const stripe = await loadStripe(pk);
    if (!stripe) throw new Error('Stripe non initialisé (clé publique invalide ?)');
    this.stripe = stripe;
    return stripe;
  }

  /** Compat */
  getStripeInstance(): Promise<Stripe> {
    return this.ensureStripe();
  }

  // ---------- API BACKEND ----------

  private getAuthHeaders(): HttpHeaders {
    // accepte auth_token OU token (pas d’interceptor)
    const token =
      localStorage.getItem('auth_token') ??
      localStorage.getItem('token') ??
      '';
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  /** Crée (ou réutilise) un PaymentIntent côté backend par paiementId. */
  async createPaymentIntent(paiementData: CreatePiPayload): Promise<CreatePiResponse> {
    if (!paiementData?.paiementId) {
      throw new Error(
        'createPaymentIntent: "paiementId" est requis. ' +
        'Crée la commande pour obtenir un paiementId avant d’initier le paiement.'
      );
    }

    const res = await firstValueFrom(
      this.http.post<CreatePiResponse>(
        `${this.backendUrl}/create-payment-intent`,
        paiementData,
        { headers: this.getAuthHeaders() }
      )
    );

    this.clientSecret = res?.clientSecret || null;
    return res;
  }

  // ---------- STRIPE ELEMENTS ----------

  /** Monte le Card Element dans un sélecteur (ex: '#stripe-card' ou '#modal-card-element') */
  async monterElementDans(selector: string): Promise<void> {
    const stripe = await this.ensureStripe();

    // (re)crée les elements avec locale FR
    this.elements = stripe.elements({ locale: 'fr' });

    // démonte l’éventuel précédent
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

  /** À appeler dans ngOnDestroy du composant */
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

  /** Confirme le paiement avec Stripe.js */
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
