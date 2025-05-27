import { Component, OnInit, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StripeService } from '../../services/stripe.service';

@Component({
  selector: 'app-paiements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './paiements.component.html',
  styleUrls: ['./paiements.component.css']
})
export class PaiementsComponent implements OnInit, AfterViewInit {
  paiements: any[] = [];
  montant: number = 100; // Montant total de la cotisation
  modePaiement: string = 'unique'; // Mode de paiement par défaut
  cardElement: any; // Référence à l'élément Stripe
  stripe: any; // Instance Stripe

  constructor(private http: HttpClient, private stripeService: StripeService) {}

  ngOnInit(): void {
    this.loadPaiements(); // Charger l'historique des paiements au démarrage
  }

  ngAfterViewInit(): void {
    this.initStripeElement(); // Initialiser l'élément Stripe après le rendu de la vue
  }

  initStripeElement(): void {
    this.stripeService.getStripeInstance().then((stripe: any) => {
      this.stripe = stripe;
      const elements = stripe.elements();
      this.cardElement = elements.create('card');
      this.cardElement.mount('#card-element'); // Monte l'élément dans le DOM
      console.log('Élément de carte Stripe monté avec succès.');
    }).catch((error: any) => {
      console.error('Erreur lors de l\'initialisation de Stripe :', error);
    });
  }

  loadPaiements(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Token non trouvé dans le stockage local.');
      return;
    }

    this.http.get<any[]>('http://localhost:8080/api/paiements', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (data) => {
        this.paiements = data;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des paiements :', err);
      }
    });
  }

  initierPaiement(): void {
    if (!this.cardElement) {
      console.error('Erreur : l\'élément de carte Stripe n\'est pas monté.');
      alert('Une erreur est survenue. Veuillez réessayer.');
      return;
    }
  
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Token non trouvé dans le stockage local.');
      alert('Vous devez être connecté pour effectuer un paiement.');
      return;
    }
  
    const paiementData = {
      amount: this.montant * 100, // Montant en centimes
      currency: 'eur', // Devise
      modePaiement: this.modePaiement,
      statut: 'en attente'
    };
  
    console.log('Données envoyées au backend :', paiementData);
  
    this.http.post('http://localhost:8080/api/paiements/create-payment-intent', paiementData, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (response: any) => {
        console.log('Réponse du backend :', response);
        const clientSecret = response.clientSecret;
        console.log('Client secret reçu :', clientSecret);
  
        this.stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: this.cardElement,
            billing_details: {
              name: 'Nom du client' // Remplacez par le nom réel
            }
          }
        }).then((result: any) => {
          if (result.error) {
            console.error('Erreur lors du paiement :', result.error.message);
            alert('Erreur lors du paiement : ' + result.error.message);
          } else {
            alert('Paiement réussi !');
            this.loadPaiements(); // Recharger l'historique des paiements
          }
        });
      },
      error: (err) => {
        console.error('Erreur lors de l\'initiation du paiement :', err);
        alert('Une erreur est survenue lors de l\'initiation du paiement. Veuillez réessayer.');
      }
    });
  }
}