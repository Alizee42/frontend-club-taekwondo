import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { loadStripe, Stripe } from '@stripe/stripe-js';

@Injectable({
  providedIn: 'root'
})
export class StripeService {
  private stripePromise: Promise<Stripe | null>;
  private backendUrl = 'http://localhost:8080/api/stripe'; // URL de votre backend Stripe
  private cardElement: any;

  getStripeInstance(): Promise<any> {
    return this.stripePromise;
  }
  constructor(private http: HttpClient) {
    this.stripePromise = loadStripe('pk_test_51QY3k3Bruaz5mgsEvMmjKUl3R9Q98EqJ2twVTYOVi9nPBrcfVexwtOpSkELyoMAzN0jOf2MvNVM9F9X8O3E2O9JE00YryVYFdp');
  }

  // Créer un PaymentIntent via le backend
  createPaymentIntent(paiementData: any): Promise<any> {
    return this.http.post(`${this.backendUrl}/create-payment-intent`, paiementData).toPromise();
  }

  // Rediriger vers Stripe Checkout
  async redirectToCheckout(clientSecret: string): Promise<void> {
    const stripe = await this.stripePromise;
    if (stripe) {
      // Vérifiez si l'élément de carte est déjà monté
      if (!this.cardElement) {
        const elements = stripe.elements();
        this.cardElement = elements.create('card');
        this.cardElement.mount('#card-element');
      
        // Ajoutez un gestionnaire d'événements pour valider les champs
        this.cardElement.on('change', (event: any) => {
          if (event.error) {
            console.error('Erreur dans l\'élément de carte :', event.error.message);
          }
        });
      }
  
      // Vérifiez si l'élément est bien monté
      if (!document.querySelector('#card-element')) {
        console.error('Erreur : l\'élément de carte Stripe n\'est pas monté.');
        return;
      }
  
      // Confirmez le paiement avec le PaymentIntent clientSecret
      const { error } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: this.cardElement,
          billing_details: {
            name: 'Nom du client', // Remplacez par le nom du client
          },
        },
      });
  
      if (error) {
        console.error('Erreur lors de la redirection vers Stripe Checkout :', error);
      } else {
        alert('Paiement réussi !');
      }
    }
  }
}