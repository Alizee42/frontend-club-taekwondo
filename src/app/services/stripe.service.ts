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

type CreatePiByPaiementId = {
  paiementId: number;
  echeanceId?: number;
  customerEmail?: string;
};

type CreatePiByAmount = {
  amount: number;   // en cents, ex: 2500 = 25,00 €
  currency: string; // ex: 'eur'
  typePaiement?: string;
  modePaiement?: string;
  customerEmail?: string;
};

type CreatePiPayload = CreatePiByPaiementId | CreatePiByAmount;

type CreatePiResponse = {
  clientSecret: string;
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

  /** Lit une meta si présente (fallback dev) */
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
        // 0) endpoint historique (si dispo)
        try {
          const r = await firstValueFrom(
            this.http.get<any>(`${this.backendUrl}/public-key`)
          );
          const k = r?.publicKey ?? r?.key ?? r?.stripePublicKey;
          if (k) return k;
        } catch {/* 404 attendu chez toi, on enchaîne */}

        // 1) paramètres admin (peut nécessiter auth)
        try {
          const admin = await firstValueFrom(
            this.http.get<any>('/api/parametres-paiement', { headers: this.getAuthHeaders() })
          );
          const k = admin?.stripePublicKey ?? admin?.clePubliqueStripe ?? admin?.publishableKey ?? admin?.stripe_pk;
          if (k) return k;
        } catch {/* ignore, on tente la publique */}

        // 2) paramètres publics (OK d’après tes logs)
        try {
          const pub = await firstValueFrom(
            this.http.get<any>('/api/parametres-paiement/public')
          );
          const k = pub?.stripePublicKey ?? pub?.clePubliqueStripe ?? pub?.publishableKey ?? pub?.stripe_pk;
          if (k) return k;
        } catch {/* on tentera meta */}

        // 3) fallback meta dans index.html (dev)
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

  /** Compat: garde l’ancienne signature utilisée par tes composants */
  getStripeInstance(): Promise<Stripe> {
    return this.ensureStripe();
  }

  // ---------- API BACKEND ----------

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') ?? '';
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  /**
   * Crée un PaymentIntent côté backend.
   * ⚠️ Ton endpoint actuel attend { paiementId }. Si tu veux payer “au montant”,
   * expose aussi un endpoint /create-payment-intent-by-amount côté backend.
   */
  async createPaymentIntent(paiementData: CreatePiPayload): Promise<CreatePiResponse> {
    if (!('paiementId' in paiementData)) {
      throw new Error(
        'createPaymentIntent: payload sans "paiementId". ' +
        'Ton backend /api/stripe/create-payment-intent attend { paiementId, ... }. ' +
        'Soit crée la commande pour obtenir un paiementId, soit implémente un endpoint “by-amount”.'
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

  /** Optionnel si tu crées l’endpoint by-amount côté backend */
  async createPaymentIntentByAmount(data: CreatePiByAmount): Promise<CreatePiResponse> {
    const res = await firstValueFrom(
      this.http.post<CreatePiResponse>(
        `${this.backendUrl}/create-payment-intent-by-amount`,
        data,
        { headers: this.getAuthHeaders() }
      )
    );
    this.clientSecret = res?.clientSecret || null;
    return res;
  }

  // ---------- STRIPE ELEMENTS ----------

  /** Monte le Card Element dans un sélecteur (ex: '#stripe-card') */
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
