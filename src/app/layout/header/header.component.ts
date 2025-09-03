import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  Router,
  RouterModule,
  ActivatedRoute,
  NavigationEnd,
} from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AuthService, Utilisateur } from '../../services/auth.service';
import { PanierService, Produit } from '../../services/panier.service';
import { StripeService } from '../../services/stripe.service';

@Component({
  standalone: true,
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  imports: [CommonModule, RouterModule, DecimalPipe, FormsModule],
})
export class HeaderComponent implements OnInit, OnDestroy {
  // UI state
  menuOpen = false;
  dropdownOpenClub = false;
  profileMenuOpen = false;
  panierOpen = false;

  // Modales
  showConnexionModal = false;
  showPaiementModal = false;
  showConfirmationModal = false;
  confirmationMessage = '';

  // Panier
  panier: Produit[] = [];
  cartCount = 0;

  // Connexion modale
  loginEmail = '';
  loginPassword = '';
  loginLoading = false;
  connexionError: string | null = null;

  // Post-login actions
  private pendingOpenCart = false;
  private pendingStartPay = false;

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
    return a + b || 'TU';
  }

  // --------- Lifecycle ---------
  ngOnInit(): void {
    // Panier réactif
    this.subs.push(
      this.panierService.cartCount$.subscribe((n) => (this.cartCount = n))
    );
    this.subs.push(
      this.panierService.panier$.subscribe((items) => (this.panier = items))
    );

    // Ouvrir le mini-panier quand la Boutique le demande
    this.subs.push(
      this.panierService.openCart$.subscribe(() => (this.panierOpen = true))
    );

    // Sur navigation : lire les query params (compat)
    this.subs.push(
      this.router.events
        .pipe(filter((e) => e instanceof NavigationEnd))
        .subscribe(() => this.applyQueryParamActions())
    );
    this.applyQueryParamActions();

    // Détecter le login pour exécuter les actions en attente (ouvrir panier / lancer paiement)
    this.subs.push(
      this.auth.isConnecte$.subscribe((isIn) => {
        if (isIn) {
          if (this.pendingOpenCart) {
            this.panierOpen = true;
            this.pendingOpenCart = false;
          }
          if (this.pendingStartPay) {
            this.pendingStartPay = false;
            if (this.panier.length > 0) this.payerParCB();
          }
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
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

    if (startPay != null) {
      if (this.isLoggedIn) {
        if (this.panier.length > 0) this.payerParCB();
      } else {
        this.pendingOpenCart = true;
        this.pendingStartPay = true;
        this.openConnexionModal();
      }
    }
  }

  // --------- Navigation ---------
  goHome(): void {
    this.router.navigate(['/']);
    this.closeMenus();
  }
  goToGalerie(): void {
    this.router.navigate(['/galerie']);
    this.closeMenus();
  }
  goToInscription(): void {
    this.router.navigate(['/inscription']);
    this.closeMenus();
  }
  goToBoutique(): void {
    this.router.navigate(['/boutique']);
    this.closeMenus();
  }
  goToEvenements(): void {
    this.router.navigate(['/evenements']);
    this.closeMenus();
  }
  goToContact(): void {
    this.router.navigate(['/contact']);
    this.closeMenus();
  }

  goToConnexion(): void {
    if (!this.isLoggedIn) {
      this.openConnexionModal(); // (le menu "Connexion" continue à router via le HTML)
    } else {
      this.router.navigate(['/connexion']);
    }
    this.closeMenus();
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
    this.closeMenus();
  }
  goToProfil(): void {
    this.router.navigate(['/profil']);
    this.closeMenus();
  }

  scrollToSection(id: string): void {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.closeMenus();
  }

  // --------- Menus / toggles ---------
  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }
  toggleProfileMenu(): void {
    this.profileMenuOpen = !this.profileMenuOpen;
    this.panierOpen = false;
  }
  togglePanier(): void {
    this.panierOpen = !this.panierOpen;
    this.profileMenuOpen = false;
  }
  closeMenus(): void {
    this.menuOpen = false;
    this.profileMenuOpen = false;
    this.panierOpen = false;
  }

  // --------- Auth ---------
  logout(): void {
    this.auth.logout();
    this.closeMenus();
    this.router.navigate(['/']);
  }

  openConnexionModal(): void {
    this.showConnexionModal = true;
    this.connexionError = null;
  }

  fermerConnexionModal(): void {
    this.showConnexionModal = false;
  }

  onLoginSubmit(): void {
    if (!this.loginEmail || !this.loginPassword) return;
    this.loginLoading = true;
    this.connexionError = null;

    this.auth
      .login({ email: this.loginEmail, password: this.loginPassword })
      .subscribe({
        next: () => {
          this.loginLoading = false;
          this.showConnexionModal = false;
          this.panierOpen = true;

          if (this.pendingStartPay) {
            this.pendingStartPay = false;
            if (this.panier.length > 0) this.payerParCB();
          }
        },
        error: (err) => {
          this.loginLoading = false;
          this.connexionError =
            err?.error?.message || 'Identifiants invalides.';
        },
      });
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
      this.pendingOpenCart = true;
      this.pendingStartPay = true;
      this.openConnexionModal();
      return;
    }
    if (this.panier.length === 0) return;

    // 💶 Montant en centimes = somme(prix unitaire * quantité)
    // 💶 Montant en centimes = somme des totaux ligne (item.prix déjà totalisé)
    const amountCents = this.panier.reduce((sum, item) => {
      const totalLigne =
        typeof item.prix === 'number' && isFinite(item.prix)
          ? item.prix
          : (item.prixBase || 0) * Math.max(1, Number(item.quantite ?? 1));
      return sum + Math.round(totalLigne * 100);
    }, 0);

    try {
      // 👉 Afficher la modale d'abord pour que #modal-card-element existe
      this.showPaiementModal = true;
      await Promise.resolve(); // laisser Angular peindre la modale

      await this.stripeService.ensureStripe();
      await this.stripeService.monterElementDans('#modal-card-element');

      await this.stripeService.createPaymentIntentByAmount({
        amount: amountCents,
        currency: 'eur',
        typePaiement: 'BOUTIQUE',
        modePaiement: 'CB',
        customerEmail: this.user?.email || undefined,
      });
    } catch (e: any) {
      this.showPaiementModal = false;
      alert(e?.message || 'Erreur lors de la préparation du paiement.');
    }
  }

  async validerPaiement(): Promise<void> {
    const res = await this.stripeService.confirmerPaiement();
    if (res.success) {
      this.showPaiementModal = false;
      this.confirmationMessage =
        '✅ Paiement réussi ! Un reçu vous a été envoyé.';
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
      this.pendingOpenCart = true;
      this.openConnexionModal();
      return;
    }
    if (this.panier.length === 0) return;

    this.confirmationMessage =
      '🧾 Commande enregistrée. Veuillez régler au club.';
    this.showConfirmationModal = true;
    this.panierService.viderPanier();
  }

  closeAllModals(): void {
    this.showPaiementModal = false;
    this.showConfirmationModal = false;
    this.confirmationMessage = '';
    this.stripeService.unmount();
  }
}
