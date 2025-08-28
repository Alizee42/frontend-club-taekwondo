import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { firstValueFrom } from 'rxjs';

type CreatePiByPaiementId = {
  paiementId: number;
  echeanceId?: number;
  customerEmail?: string;
};

type CreatePiByAmount = {
  amount: number;
  currency: string;
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
  private stripePromise: Promise<Stripe | null>;
  /**
   * Si tu utilises le proxy Angular (proxy.conf.json -> /api -> http://localhost:8080),
   * garde '/api/stripe'. Sinon, mets 'http://localhost:8080/api/stripe'.
   */
  private backendUrl = '/api/stripe';

  public cardElement: any;               // utilisé par le composant
  public clientSecret: string | null = null;

  constructor(private http: HttpClient) {
    this.stripePromise = loadStripe('pk_test_51QY3k3Bruaz5mgsEvMmjKUl3R9Q98EqJ2twVTYOVi9nPBrcfVexwtOpSkELyoMAzN0jOf2MvNVM9F9X8O3E2O9JE00YryVYFdp');
  }

  getStripeInstance(): Promise<Stripe | null> {
    return this.stripePromise;
  }

  // -------- API BACKEND --------

  /**
   * Crée (ou réutilise si confirmable) un PaymentIntent côté backend.
   * Le backend actuel attend { paiementId, ... }.
   * On autorise aussi un payload "amount/currency" côté TS pour compiler,
   * mais on lève une erreur explicite si paiementId est absent.
   */
  async createPaymentIntent(paiementData: CreatePiPayload): Promise<CreatePiResponse> {
    // Garde runtime: ton endpoint /api/stripe/create-payment-intent côté Spring exige un paiementId
    if (!('paiementId' in paiementData)) {
      throw new Error(
        'createPaymentIntent: payload sans "paiementId". ' +
        'Le backend /api/stripe/create-payment-intent attend { paiementId, echeanceId?, customerEmail? }. ' +
        'Crée d’abord le paiement en BDD pour obtenir un paiementId, ' +
        'ou expose un endpoint boutique dédié acceptant { amount, currency, ... }.'
      );
    }

    const token = localStorage.getItem('token') ?? '';
    const headers: HttpHeaders = new HttpHeaders(
      token ? { Authorization: `Bearer ${token}` } : {}
    );

    const obs$ = this.http.post<CreatePiResponse>(
      `${this.backendUrl}/create-payment-intent`,
      paiementData,
      { headers }
    );

    const res = await firstValueFrom(obs$);
    // on stocke le clientSecret pour confirmCardPayment
    if (res?.clientSecret) this.clientSecret = res.clientSecret;
    return res;
  }

  // -------- STRIPE ELEMENTS --------

  /** Monte le Card Element dans un sélecteur CSS (ex: '#stripe-card') */
  async monterElementDans(selector: string) {
    const stripe = await this.stripePromise;
    if (!stripe) {
      console.error('Stripe non initialisé');
      return;
    }

    // démonter l’élément précédent si existant
    if (this.cardElement) {
      try { this.cardElement.unmount(); } catch {}
      this.cardElement = null;
    }

    const elements = stripe.elements();
    this.cardElement = elements.create('card');
    this.cardElement.mount(selector);

    // Optionnel : gestion des erreurs de saisie
    this.cardElement.on('change', (event: any) => {
      if (event.error) {
        console.error("Erreur dans l'élément de carte :", event.error.message);
      }
    });
  }

  /** Confirme le paiement côté Stripe.js avec le clientSecret renvoyé par le backend */
  async confirmerPaiement(): Promise<{ success: boolean; message: string }> {
    const stripe = await this.stripePromise;
    if (!stripe) return { success: false, message: 'Stripe non initialisé' };
    if (!this.cardElement) return { success: false, message: 'Élément carte non monté' };
    if (!this.clientSecret) return { success: false, message: 'Client secret manquant' };

    const { error } = await stripe.confirmCardPayment(this.clientSecret, {
      payment_method: { card: this.cardElement },
    });

    if (error) {
      return { success: false, message: error.message ?? 'Erreur inconnue' };
    }
    return { success: true, message: '' };
  }
}
