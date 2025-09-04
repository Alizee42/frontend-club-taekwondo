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
import { HttpClient } from '@angular/common/http';


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
  private pendingPaiementId: number | null = null; // mémorise un paiementId éventuel depuis l’URL

  // ✅ Etat d’auth réactif (remplace les getters)
  isLoggedIn = false;
  user: Utilisateur | null = null;

  private subs: Subscription[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private auth: AuthService,
    private panierService: PanierService,
    private stripeService: StripeService,
    private http: HttpClient  // 🔽 Ajout

  ) {}

  ngOnInit(): void {
    console.log('[Header] ngOnInit');

    // ✅ S'abonner à l'état d'auth pour garder le header synchronisé
    this.subs.push(
      this.auth.authState$.subscribe((s) => {
        this.isLoggedIn = s.isConnecte;
        this.user = s.user;
        // Debug utile
        console.log('[Header] authState$ -> isLoggedIn:', this.isLoggedIn, 'user:', this.user);
      })
    );

    // Panier réactif
    this.subs.push(
      this.panierService.cartCount$.subscribe((n) => {
        this.cartCount = n;
        console.log('[Header] cartCount$ ->', n);
      })
    );
    this.subs.push(
      this.panierService.panier$.subscribe((items) => {
        this.panier = items;
        console.log('[Header] panier$ ->', items);
      })
    );

    // Ouvrir le mini-panier quand la Boutique le demande
    this.subs.push(
      this.panierService.openCart$.subscribe(() => {
        console.log('[Header] openCart$ -> ouvrir mini-panier');
        this.panierOpen = true;
      })
    );

    // Sur navigation : lire les query params (compat)
    this.subs.push(
      this.router.events
        .pipe(filter((e) => e instanceof NavigationEnd))
        .subscribe((e) => {
          console.log('[Header] NavigationEnd ->', e);
          this.applyQueryParamActions();
        })
    );
    this.applyQueryParamActions();

    // Détecter le login pour exécuter les actions en attente (ouvrir panier / lancer paiement)
    this.subs.push(
      this.auth.isConnecte$.subscribe((isIn) => {
        console.log('[Header] isConnecte$ ->', isIn);
        if (isIn) {
          if (this.pendingOpenCart) {
            this.panierOpen = true;
            this.pendingOpenCart = false;
            console.log('[Header] pendingOpenCart consommé');
          }
          if (this.pendingStartPay) {
            this.pendingStartPay = false;
            console.log('[Header] pendingStartPay consommé -> tenter paiement');
            if (this.panier.length > 0) this.payerParCB();
          }
        }
      })
    );
  }

  ngOnDestroy(): void {
    console.log('[Header] ngOnDestroy');
    this.subs.forEach((s) => s.unsubscribe());
    this.stripeService.unmount();
  }

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
    const qpPaiementId = qp.get('paiementId'); // supporte ?paiementId=123

    console.log('[Header] QueryParams ->', { openCart, startPay, qpPaiementId });

    this.pendingPaiementId = qpPaiementId ? Number(qpPaiementId) : null;
    if (this.pendingPaiementId && !Number.isFinite(this.pendingPaiementId)) {
      console.warn('[Header] qpPaiementId non numérique ->', qpPaiementId);
      this.pendingPaiementId = null;
    }

    if (!this.pendingPaiementId) {
      const pidLS = localStorage.getItem('paiementId');
      console.log('[Header] fallback localStorage.paiementId =', pidLS);
      if (pidLS && Number.isFinite(Number(pidLS))) {
        this.pendingPaiementId = Number(pidLS);
      }
    }

    console.log('[Header] pendingPaiementId final =', this.pendingPaiementId);

    if (openCart != null) {
      this.panierOpen = true;
      console.log('[Header] openCart -> ouverture mini-panier');
    }

    if (startPay != null) {
      console.log('[Header] startPay détecté, loggedIn =', this.isLoggedIn);
      if (this.isLoggedIn) {
        if (this.panier.length > 0) {
          console.log('[Header] startPay -> déclenche payerParCB()');
          this.payerParCB();
        } else {
          console.warn('[Header] startPay mais panier vide');
        }
      } else {
        this.pendingOpenCart = true;
        this.pendingStartPay = true;
        console.log('[Header] pas connecté -> pendingOpenCart+pendingStartPay puis ouvrir modal');
        this.openConnexionModal();
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
      this.openConnexionModal(); // on reste en SPA
    } else {
      this.router.navigate(['/connexion']);
    }
    this.closeMenus();
  }

  goToDashboard(): void {
    // On route selon le rôle courant
    const role = (this.user?.role ?? this.auth.getRole() ?? '').toString().toUpperCase();
    if (role === 'ADMIN') this.router.navigate(['/admin/dashboard-admin']);
    else if (role === 'MEMBRE') this.router.navigate(['/membre/dashboard-membre']);
    else if (role === 'PARENT') this.router.navigate(['/parent/dashboard-parent']);
    else this.router.navigate(['/dashboard']); // fallback générique si tu as cette route
    this.closeMenus();
  }

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
    console.log('[Header] logout()');
    this.auth.logout(); // met à jour l'état réactif
    this.closeMenus();
    this.router.navigate(['/']);
  }

  openConnexionModal(): void {
    console.log('[Header] openConnexionModal()');
    this.showConnexionModal = true;
    this.connexionError = null;
  }

  fermerConnexionModal(): void {
    console.log('[Header] fermerConnexionModal()');
    this.showConnexionModal = false;
  }

  onLoginSubmit(): void {
    if (!this.loginEmail || !this.loginPassword) return;
    this.loginLoading = true;
    this.connexionError = null;
    console.log('[Header] onLoginSubmit email=', this.loginEmail);

    this.auth.login({ email: this.loginEmail, password: this.loginPassword }).subscribe({
      next: () => {
        this.loginLoading = false;
        this.showConnexionModal = false;
        this.panierOpen = true; // rouvre le panier
        console.log('[Header] login OK, pendingStartPay=', this.pendingStartPay);

        if (this.pendingStartPay) {
          this.pendingStartPay = false;
          if (this.panier.length > 0) this.payerParCB();
        }
      },
      error: (err) => {
        this.loginLoading = false;
        this.connexionError = err?.error?.message || 'Identifiants invalides.';
        console.error('[Header] login KO:', err);
      },
    });
  }

  // --------- Panier ---------
  supprimerDuPanier(index: number): void {
    console.log('[Header] supprimerDuPanier index=', index);
    const copy = [...this.panier];
    copy.splice(index, 1);
    this.panierService.setPanier(copy);
  }

  // --------- Paiement (Option A : paiementId requis) ---------
  private async getEnfantsParent(): Promise<any[]> {
  try {
    const response = await this.http.get<any[]>('/api/membres/mes-enfants', {
      headers: this.getAuthHeaders()
    }).toPromise();
    return response || [];
  } catch (error) {
    console.error('[Header] Erreur récupération enfants:', error);
    return [];
  }
}

// Remplacez complètement la méthode payerParCB() par cette version robuste :
async payerParCB(): Promise<void> {
  console.log('[Header] payerParCB() lancé, isLoggedIn=', this.isLoggedIn, 'panier=', this.panier);

  if (!this.isLoggedIn) {
    console.log('[Header] pas connecté → on attend connexion');
    this.pendingOpenCart = true;
    this.pendingStartPay = true;
    this.openConnexionModal();
    return;
  }

  if (this.panier.length === 0) {
    console.warn('[Header] panier vide, stop paiement');
    alert('Le panier est vide. Ajoutez des produits avant de procéder au paiement.');
    return;
  }

  try {
    let membreId: number | null = null;
    
    // 🔽 GESTION DYNAMIQUE DU MEMBRE_ID
    console.log('[Header] Rôle utilisateur:', this.user?.role);
    
    if (this.user?.role === 'PARENT') {
      console.log('[Header] Parent détecté - récupération des enfants...');
      const enfants = await this.getEnfantsParent();
      console.log('[Header] Enfants trouvés:', enfants);
      
      if (enfants.length === 0) {
        alert('Aucun enfant trouvé pour effectuer l\'achat. Veuillez contacter l\'administration.');
        return;
      }
      
      if (enfants.length === 1) {
        // Un seul enfant : utilisation automatique
        membreId = enfants[0].id;
        console.log('[Header] Un seul enfant trouvé:', enfants[0].nom, enfants[0].prenom, 'ID:', membreId);
      } else {
        // Plusieurs enfants : sélection du premier par défaut
        // TODO: Implémenter une sélection utilisateur plus tard
        membreId = enfants[0].id;
        console.log('[Header] Plusieurs enfants - sélection automatique du premier:', enfants[0].nom, enfants[0].prenom, 'ID:', membreId);
      }
    } else if (this.user?.role === 'MEMBRE') {
      // Pour un membre : pas besoin de membreId explicite (le backend le déduira)
      console.log('[Header] Membre détecté - pas de membreId explicite requis');
      membreId = null;
    } else {
      console.log('[Header] Rôle non géré pour achat boutique:', this.user?.role);
    }

    // 1) Créer le paiement depuis le panier
    console.log('[Header] Création du paiement depuis le panier...');
    
    const requestBody: any = {
      modePaiement: 'stripe',
      items: this.panier.map(item => ({
        produitId: item.id,
        quantite: item.quantite,
        taille: item.taille,
        couleur: item.couleur,
        flocageActif: item.flocageActif,
        flocage: item.flocage
      }))
    };

    // Ajouter membreId seulement si nécessaire
    if (membreId) {
      requestBody.membreId = membreId;
      console.log('[Header] membreId ajouté à la requête:', membreId);
    }
    
    console.log('[Header] Corps de la requête:', requestBody);
    
    const createResponse = await this.http.post<any>('/api/paiements/from-cart', requestBody, {
      headers: this.getAuthHeaders()
    }).toPromise();

    const paiementId = createResponse?.paiementId;
    if (!paiementId) {
      throw new Error('Impossible de créer le paiement');
    }

    console.log('[Header] Paiement créé avec ID:', paiementId);

    // 2) Procéder au paiement Stripe
    this.showPaiementModal = true;
    await Promise.resolve();

    await this.stripeService.ensureStripe();
    console.log('[Header] Stripe initialisé');
    
    await this.stripeService.monterElementDans('#modal-card-element');
    console.log('[Header] Card Element monté');

    console.log('[Header] Appel createPaymentIntent() →', {
      paiementId,
      customerEmail: this.user?.email || undefined,
    });

    const res = await this.stripeService.createPaymentIntent({
      paiementId,
      customerEmail: this.user?.email || undefined,
    });

    console.log('[Header] PaymentIntent OK ->', res);

  } catch (e: any) {
    this.showPaiementModal = false;
    console.error('[Header] Erreur préparation paiement:', e);
    
    // Messages d'erreur plus spécifiques
    let errorMessage = 'Erreur lors de la préparation du paiement.';
    if (e?.error?.error) {
      errorMessage = e.error.error;
    } else if (e?.message) {
      errorMessage = e.message;
    }
    
    alert(errorMessage);
  }
}
  
  private getAuthHeaders(): any {
    const token = localStorage.getItem('auth_token') ?? localStorage.getItem('token') ?? '';
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async validerPaiement(): Promise<void> {
    console.log('[Header] validerPaiement()');
    const res = await this.stripeService.confirmerPaiement();
    console.log('[Header] confirmerPaiement ->', res);

    if (res.success) {
      this.showPaiementModal = false;
      this.confirmationMessage = '✅ Paiement réussi ! Un reçu vous a été envoyé.';
      this.panierService.viderPanier();
      console.log('[Header] paiement OK, panier vidé');
      setTimeout(() => (this.confirmationMessage = ''), 4000);
    } else {
      console.warn('[Header] paiement non confirmé:', res);
      alert(res.message || 'Paiement non confirmé.');
    }
  }

  fermerPaiementModal(): void {
    console.log('[Header] fermerPaiementModal()');
    this.showPaiementModal = false;
    this.stripeService.unmount();
  }

  payerAuClub(): void {
    console.log('[Header] payerAuClub()');
    if (!this.isLoggedIn) {
      this.pendingOpenCart = true;
      this.openConnexionModal();
      return;
    }
    if (this.panier.length === 0) return;

    this.confirmationMessage = '🧾 Commande enregistrée. Veuillez régler au club.';
    this.showConfirmationModal = true;
    this.panierService.viderPanier();
    console.log('[Header] commande au club enregistrée, panier vidé');
  }

  closeAllModals(): void {
    console.log('[Header] closeAllModals()');
    this.showPaiementModal = false;
    this.showConfirmationModal = false;
    this.confirmationMessage = '';
    this.stripeService.unmount();
  }

  getInitials(): string {
    const a = (this.user?.prenom?.[0] || '').toUpperCase();
    const b = (this.user?.nom?.[0] || '').toUpperCase();
    return (a + b) || 'TU';
  }
}
