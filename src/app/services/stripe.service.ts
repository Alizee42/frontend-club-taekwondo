import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { loadStripe, Stripe } from '@stripe/stripe-js';

@Injectable({
  providedIn: 'root'
})
export class StripeService {
  private stripePromise: Promise<Stripe | null>;
  private backendUrl = '/api/stripe'; // URL de votre backend Stripe
  public cardElement: any; // Doit être public pour accès externe
  public clientSecret: string | null = null; // Stocke le clientSecret pour le paiement

  constructor(private http: HttpClient) {
    this.stripePromise = loadStripe('pk_test_51QY3k3Bruaz5mgsEvMmjKUl3R9Q98EqJ2twVTYOVi9nPBrcfVexwtOpSkELyoMAzN0jOf2MvNVM9F9X8O3E2O9JE00YryVYFdp');
  }

  getStripeInstance(): Promise<any> {
    return this.stripePromise;
  }

  // Créer un PaymentIntent via le backend
  createPaymentIntent(paiementData: any): Promise<any> {
    const token = localStorage.getItem('token');
    return this.http.post(
      `${this.backendUrl}/create-payment-intent`,
      paiementData,
      { headers: { Authorization: `Bearer ${token}` } }
    ).toPromise();
  }

  // Monter l'élément Stripe dans le DOM (modale)
  async monterElementDans(selector: string) {
    const stripe = await this.stripePromise;
    if (stripe) {
      // Démonte l'ancien élément si besoin
      if (this.cardElement) {
        this.cardElement.unmount();
        this.cardElement = null;
      }
      const elements = stripe.elements();
      this.cardElement = elements.create('card');
      this.cardElement.mount(selector);

      // Optionnel : gestion des erreurs de saisie
      this.cardElement.on('change', (event: any) => {
        if (event.error) {
          console.error('Erreur dans l\'élément de carte :', event.error.message);
        }
      });
    }
  }

  // Confirmer le paiement Stripe (depuis la modale)
  async confirmerPaiement(): Promise<{success: boolean, message: string}> {
    const stripe = await this.stripePromise;
    if (!stripe || !this.cardElement) return {success: false, message: 'Stripe non initialisé'};
    if (!this.clientSecret) return {success: false, message: 'Client secret manquant'};
    const { error } = await stripe.confirmCardPayment(this.clientSecret, {
      payment_method: { card: this.cardElement }
    });
    if (error) return {success: false, message: error.message ?? 'Erreur inconnue'};
    return {success: true, message: ''};
  }
}