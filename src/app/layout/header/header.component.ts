import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule, ActivatedRoute, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { CommonModule, DecimalPipe } from '@angular/common';

import { AuthService, Utilisateur } from '../../services/auth.service';
import { PanierService, Produit } from '../../services/panier.service';
import { StripeService } from '../../services/stripe.service';

@Component({
  standalone: true,
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  imports: [CommonModule, RouterModule, DecimalPipe],
})
export class HeaderComponent implements OnInit, OnDestroy {
  // UI state
  menuOpen = false;
  dropdownOpenClub = false;
  profileMenuOpen = false;
  panierOpen = false;
  showConnexionModal = false;  // Affichage de la modale de connexion

  showPaiementModal = false;
  showConfirmationModal = false;
  confirmationMessage = '';

  // Panier
  panier: Produit[] = [];
  cartCount = 0;

  // Connexion modal
  loginEmail: string = '';
  loginPassword: string = '';
  connexionError: string | null = null;

  private subs: Subscription[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private auth: AuthService,
    private panierService: PanierService,
    private stripeService: StripeService
  ) {}

  // --------- Getters ---------
  get isLoggedIn(): boolean {
    return this.auth.isConnecte();
  }

  get user(): Utilisateur | null {
    return this.auth.getUtilisateurConnecte();
  }

  getInitials(): string {
    const u = this.user;
    const a = (u?.prenom?.[0] || '').toUpperCase();
    const b = (u?.nom?.[0] || '').toUpperCase();
    return (a + b) || 'TU';
  }

  // --------- Lifecycle ---------
  ngOnInit(): void {
    // badge + liste panier réactifs
    this.subs.push(this.panierService.cartCount$.subscribe(n => (this.cartCount = n)));
    this.subs.push(this.panierService.panier$.subscribe(items => (this.panier = items)));

    // Sur chaque navigation, lis les query params pour ouvrir le panier / démarrer le paiement
    this.subs.push(
      this.router.events
        .pipe(filter(e => e instanceof NavigationEnd))
        .subscribe(() => this.applyQueryParamActions())
    );

    // Applique aussi au chargement initial
    this.applyQueryParamActions();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.stripeService.unmount();
  }

  // --------- Navigation helpers ---------
  private deepest(route: ActivatedRoute): ActivatedRoute {
    let r = route;
    while (r.firstChild) r = r.firstChild;
    return r;
  }

  private applyQueryParamActions(): void {
    const r = this.deepest(this.route);
    const qp = r.snapshot.queryParamMap;

    const openCart = qp.get('openCart');
    const startPay = qp.get('startPay');

    if (openCart != null) {
      this.panierOpen = true;
    }

    // Lancer Stripe automatiquement si demandé et utilisateur connecté
    if (startPay != null && this.isLoggedIn && this.panier.length > 0) {
      // évite de relancer si la modale est déjà ouverte
      if (!this.showPaiementModal) {
        this.payerParCB();
      }
    }
  }

  // --------- Navigation ---------
  goHome(): void { this.router.navigate(['/']); this.closeMenus(); }
  goToGalerie(): void { this.router.navigate(['/galerie']); this.closeMenus(); }
  goToInscription(): void { this.router.navigate(['/inscription']); this.closeMenus(); }
  goToBoutique(): void { this.router.navigate(['/boutique']); this.closeMenus(); }
  goToEvenements(): void { this.router.navigate(['/evenements']); this.closeMenus(); }
  goToContact(): void { this.router.navigate(['/contact']); this.closeMenus(); }
  
  goToConnexion(): void {
    if (!this.isLoggedIn) {
      this.showConnexionModal = true;  // Affiche la modale de connexion
    } else {
      this.router.navigate(['/connexion']); 
    }
    this.closeMenus();
  }

  goToDashboard(): void { this.router.navigate(['/dashboard']); this.closeMenus(); }
  goToProfil(): void { this.router.navigate(['/profil']); this.closeMenus(); }

  scrollToSection(id: string): void {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.closeMenus();
  }

  // --------- Menus / toggles ---------
  toggleMenu(): void { this.menuOpen = !this.menuOpen; }
  toggleProfileMenu(): void { this.profileMenuOpen = !this.profileMenuOpen; this.panierOpen = false; }
  togglePanier(): void { this.panierOpen = !this.panierOpen; this.profileMenuOpen = false; }
  closeMenus(): void { this.menuOpen = false; this.profileMenuOpen = false; this.panierOpen = false; }

  // --------- Auth ---------
  logout(): void {
    this.auth.logout();
    this.closeMenus();
    this.router.navigate(['/']);
  }

  // --------- Panier ---------
  supprimerDuPanier(index: number): void {
    const copy = [...this.panier];
    copy.splice(index, 1);
    this.panierService.setPanier(copy);
  }

  // --------- Paiement ---------
  async payerParCB(): Promise<void> {
    if (!this.isLoggedIn) {
      // Ajoute openCart + startPay pour revenir après login
      this.router.navigate(['/connexion'], { queryParams: { redirect: '/boutique', openCart: 1, startPay: 1 } });
      return;
    }
    if (this.panier.length === 0) return;

    const amountCents = this.panier.reduce((sum, item) => {
      const cents = Math.round((item.prix || 0) * 100); // item.prix = total déjà multiplié par quantité
      return sum + cents;
    }, 0);

    try {
      await this.stripeService.ensureStripe();
      await this.stripeService.monterElementDans('#modal-card-element');

      await this.stripeService.createPaymentIntentByAmount({
        amount: amountCents,
        currency: 'eur',
        typePaiement: 'BOUTIQUE',
        modePaiement: 'CB',
        customerEmail: this.user?.email || undefined,
      });

      this.showPaiementModal = true;
    } catch (e: any) {
      alert(e?.message || 'Erreur lors de la préparation du paiement.');
    }
  }

  async validerPaiement(): Promise<void> {
    const res = await this.stripeService.confirmerPaiement();
    if (res.success) {
      this.showPaiementModal = false;
      this.confirmationMessage = '✅ Paiement réussi ! Un reçu vous a été envoyé.';
      this.panierService.viderPanier();
      setTimeout(() => (this.confirmationMessage = ''), 4000);
    } else {
      alert(res.message || 'Paiement non confirmé.');
    }
  }

  fermerPaiementModal(): void {
    this.showPaiementModal = false;
    this.stripeService.unmount();
  }

  payerAuClub(): void {
    if (!this.isLoggedIn) {
      // Ouvre seulement le panier après login
      this.router.navigate(['/connexion'], { queryParams: { redirect: '/boutique', openCart: 1 } });
      return;
    }
    if (this.panier.length === 0) return;

    this.confirmationMessage = '🧾 Commande enregistrée. Veuillez régler au club.';
    this.showConfirmationModal = true;
    this.panierService.viderPanier();
  }

  closeAllModals(): void {
    this.showPaiementModal = false;
    this.showConfirmationModal = false;
    this.confirmationMessage = '';
    this.stripeService.unmount();
  }

  // Fermeture modale connexion
  fermerConnexionModal(): void {
    this.showConnexionModal = false;
  }

  // Soumission du formulaire de connexion
  onLoginSubmit(): void {
    console.log('Tentative de connexion avec:', this.loginEmail, this.loginPassword);
    // Appeler votre service de connexion ici
  }
}
