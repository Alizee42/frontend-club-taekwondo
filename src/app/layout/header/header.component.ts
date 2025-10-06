import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import {
  Router,
  RouterModule,
  ActivatedRoute,
  NavigationEnd,
} from '@angular/router';
import { Subscription, filter, firstValueFrom } from 'rxjs';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { AuthService, Utilisateur } from '../../services/auth.service';
import { PanierService, Produit } from '../../services/panier.service';
import { StripeService } from '../../services/stripe.service';
import { environment } from '../../../environments/environment';
import { ClubService, Club } from '../../services/club.service';
import { Output, EventEmitter } from '@angular/core';

interface PanierItem extends Produit {
  beneficiaireId?: number | null;
  beneficiairePrenom?: string;
  beneficiaireNom?: string;
}

@Component({
  standalone: true,
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  imports: [CommonModule, RouterModule, DecimalPipe, FormsModule],
})
export class HeaderComponent implements OnInit, OnDestroy {
  selectedClub: Club | null = null;
  @Output() demandeChangementClub = new EventEmitter<void>();
  private readonly API_BASE = environment.apiUrl;

  // UI state
  menuOpen = false;
  dropdownOpenClub = false;
  panierOpen = false;
  userDropdownOpen = false;
  notificationsOpen = false;

  // Modales
  showConnexionModal = false;
  showPaiementModal = false;
  showConfirmationModal = false;
  confirmationMessage = '';

  // Panier
  panier: PanierItem[] = [];
  cartCount = 0;

  // Connexion modale
  loginEmail = '';
  loginPassword = '';
  loginLoading = false;
  connexionError: string | null = null;

  // Post-login actions
  private pendingOpenCart = false;
  private pendingStartPay = false;
  private pendingPaiementId: number | null = null;

  // Auth
  isLoggedIn = false;
  user: Utilisateur | null = null;

  // Propriété calculée pour s'assurer de l'état d'authentification
  get isUserLoggedIn(): boolean {
    return this.isLoggedIn && !!this.user && !!this.auth.getToken();
  }

  // Enfants (Parent)
  enfants: { id: number; prenom: string; nom: string }[] = [];
  private enfantsLoaded = false;

  // Notifications
  notifications: any[] = [];
  unreadCount = 0;

  private subs: Subscription[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private auth: AuthService,
    private panierService: PanierService,
    private stripeService: StripeService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private clubService: ClubService
  ) {
    this.selectedClub = this.clubService.getSelectedClub();
  }

  changeClub() {
    this.clubService.clearSelectedClub();
    window.location.reload();
  }

  ngOnInit(): void {
    // Auth
    this.subs.push(
      this.auth.authState$.subscribe((s) => {
        this.isLoggedIn = s.isConnecte;
        this.user = s.user;
        
        // Forcer la détection de changement pour mettre à jour le DOM
        this.cdr.detectChanges();
        
        if (this.isLoggedIn && this.isParent() && !this.enfantsLoaded) {
          this.loadEnfants();
        }
        // Charger les notifications quand connecté
        if (this.isLoggedIn) {
          this.loadNotifications();
        } else {
          this.notifications = [];
          this.unreadCount = 0;
        }
      })
    );

    // Panier
    this.subs.push(
      this.panierService.cartCount$.subscribe((n) => (this.cartCount = n))
    );
    this.subs.push(
      this.panierService.panier$.subscribe((items) => {
        this.panier = items as PanierItem[];
        this.applyBeneficiaryDefault();
      })
    );

    // Ouvrir mini-panier sur demande
    this.subs.push(
      this.panierService.openCart$.subscribe(() => (this.panierOpen = true))
    );

    // Navigation / query params
    this.subs.push(
      this.router.events
        .pipe(filter((e) => e instanceof NavigationEnd))
        .subscribe(() => this.applyQueryParamActions())
    );
    this.applyQueryParamActions();

    // Actions en attente après login
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

  // ======= Utils =======
  private isParent(): boolean {
    const role = (this.user?.role ?? this.auth.getRole() ?? '').toString().toUpperCase();
    return role === 'PARENT';
  }

  private isMembre(): boolean {
    const role = (this.user?.role ?? this.auth.getRole() ?? '').toString().toUpperCase();
    return role === 'MEMBRE';
  }

  private isAdmin(): boolean {
    const role = (this.user?.role ?? this.auth.getRole() ?? '').toString().toUpperCase();
    return role === 'ADMIN';
  }

  // Propriété publique pour utiliser dans le template
  get userRole(): string {
    return (this.user?.role ?? this.auth.getRole() ?? '').toString().toUpperCase();
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
    const qpPaiementId = qp.get('paiementId');

    this.pendingPaiementId = qpPaiementId ? Number(qpPaiementId) : null;
    if (this.pendingPaiementId && !Number.isFinite(this.pendingPaiementId)) {
      console.warn('[Header] qpPaiementId non numérique ->', qpPaiementId);
      this.pendingPaiementId = null;
    }
    if (!this.pendingPaiementId) {
      const pidLS = localStorage.getItem('paiementId');
      if (pidLS && Number.isFinite(Number(pidLS))) this.pendingPaiementId = Number(pidLS);
    }

    if (openCart != null) this.panierOpen = true;

    if (startPay != null) {
      if (this.isLoggedIn) {
        if (this.panier.length > 0) this.payerParCB();
        else console.warn('[Header] startPay mais panier vide');
      } else {
        this.pendingOpenCart = true;
        this.pendingStartPay = true;
        this.openConnexionModal();
      }
    }
  }

  // ======= Navigation =======
  goHome(): void { 
    // 🏠 Navigation vers l'accueil SANS déconnexion
    this.router.navigate(['/']); 
    this.closeMenus(); 
  }
  goToGalerie(): void { this.router.navigate(['/galerie']); this.closeMenus(); }
  goToInscription(): void { this.router.navigate(['/inscription']); this.closeMenus(); }
  goToBoutique(): void { this.router.navigate(['/boutique']); this.closeMenus(); }
  goToEvenements(): void { this.router.navigate(['/evenements']); this.closeMenus(); }
  goToContact(): void { this.router.navigate(['/contact']); this.closeMenus(); }

  goToConnexion(): void {
    if (!this.isLoggedIn) this.openConnexionModal();
    else this.router.navigate(['/connexion']);
    this.closeMenus();
  }

  goToDashboard(): void {
    // Dashboard de base simple pour tous
    this.router.navigate(['/dashboard']);
    this.closeMenus();
  }

  goToSpecializedDashboard(): void {
    // Dashboard spécialisé selon le rôle
    const role = (this.user?.role ?? this.auth.getRole() ?? '').toString().toUpperCase();
    if (role === 'ADMIN') this.router.navigate(['/admin/dashboard-admin']);
    else if (role === 'MEMBRE') this.router.navigate(['/membre/dashboard-membre']);
    else if (role === 'PARENT') this.router.navigate(['/parent/dashboard-parent']);
    else this.router.navigate(['/dashboard']); // Fallback vers dashboard de base
    this.closeMenus();
  }

  goToProfil(): void { this.router.navigate(['/profil']); this.closeMenus(); }

  scrollToSection(id: string): void {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.closeMenus();
  }

  // ======= Menus / toggles =======
  toggleMenu(): void { this.menuOpen = !this.menuOpen; }
  togglePanier(): void {
    const opening = !this.panierOpen;
    this.panierOpen = opening;

    if (opening && this.isLoggedIn && this.isParent() && !this.enfantsLoaded) {
      this.loadEnfants();
    }
  }
  closeMenus(): void { 
    this.menuOpen = false; 
    this.panierOpen = false; 
    this.userDropdownOpen = false;
    this.notificationsOpen = false;
  }

  // ======= Auth =======
  logout(): void {
    // Forcer la fermeture immédiate de tous les dropdowns
    this.closeMenus();
    
    // Réinitialiser l'état local immédiatement
    this.isLoggedIn = false;
    this.user = null;
    this.notifications = [];
    this.unreadCount = 0;
    this.enfants = [];
    this.enfantsLoaded = false;
    
    // Forcer la détection de changement immédiatement
    this.cdr.detectChanges();
    
    // Ensuite appeler le service
    this.auth.logout();
    this.router.navigate(['/']);
  }

  // ======= Méthode de diagnostic temporaire =======
  debugAuthState(): void {
    console.log('🔍 DIAGNOSTIC AUTH STATE:');
    console.log('- this.isLoggedIn:', this.isLoggedIn);
    console.log('- this.user:', this.user);
    console.log('- authService getUtilisateurConnecte():', this.auth.getUtilisateurConnecte());
    console.log('- authService isConnecte():', this.auth.isConnecte());
    console.log('- authService getToken():', this.auth.getToken());
    console.log('- localStorage token:', localStorage.getItem('token') || localStorage.getItem('auth_token'));
  }

  // ======= Dropdown utilisateur =======
  getUserInitials(): string {
    return this.getInitials();
  }

  getUserName(): string {
    if (!this.user) return '';

    // Si pas parent, retour simple
    if (!this.isParent()) {
      return `${this.user.prenom ?? ''} ${this.user.nom ?? ''}`.trim();
    }

    // Ensemble des combinaisons enfants pour éviter une confusion
    const enfantsCombinaisons = new Set(
      (this.enfants || []).map(e => `${(e.prenom || '').trim().toLowerCase()}|${(e.nom || '').trim().toLowerCase()}`)
    );

    // Liste de candidats possibles pour le prénom du parent (différentes conventions backend possibles)
    const candidatsPrenom: (string | undefined)[] = [
      (this.user as any).prenomParent,
      (this.user as any).parentPrenom,
      (this.user as any).prenom_adulte,
      (this.user as any).prenomAdulte,
      (this.user as any).prenom_parent,
      this.user.prenom,
    ];

    // Idem pour le nom
    const candidatsNom: (string | undefined)[] = [
      (this.user as any).nomParent,
      (this.user as any).parentNom,
      (this.user as any).nom_adulte,
      (this.user as any).nomAdulte,
      (this.user as any).nom_parent,
      this.user.nom,
    ];

    // Normalisation + filtrage basique
    const norm = (v?: string) => (v || '').trim();
    const prenomsNettoyes = candidatsPrenom.filter(v => !!norm(v));
    const nomsNettoyes = candidatsNom.filter(v => !!norm(v));

    // Fonction pour trouver un couple qui ne correspond pas à un enfant
    const trouverCoupleValide = (): { p: string; n: string } | null => {
      for (const p of prenomsNettoyes) {
        for (const n of nomsNettoyes) {
          const key = `${norm(p).toLowerCase()}|${norm(n).toLowerCase()}`;
          if (!enfantsCombinaisons.has(key)) {
            return { p: norm(p), n: norm(n) };
          }
        }
      }
      return null;
    };

    const couple = trouverCoupleValide();
    if (couple) {
      return `${couple.p} ${couple.n}`.trim();
    }

    // Fallback : éviter d'afficher un prénom/nom enfant -> afficher libellé générique + email ou ID
    const fallbackNom = this.user.email ? `Parent (${this.user.email.split('@')[0]})` : 'Parent';
    return fallbackNom;
  }

  toggleUserDropdown(): void {
    this.userDropdownOpen = !this.userDropdownOpen;
  }

  closeUserDropdown(): void {
    this.userDropdownOpen = false;
  }

  openConnexionModal(): void {
    this.showConnexionModal = true;
    this.connexionError = null;
  }
  fermerConnexionModal(): void { this.showConnexionModal = false; }

  onLoginSubmit(): void {
    if (!this.loginEmail || !this.loginPassword) return;
    this.loginLoading = true;
    this.connexionError = null;

    this.auth.login({ email: this.loginEmail, password: this.loginPassword }).subscribe({
      next: () => {
        this.loginLoading = false;
        this.showConnexionModal = false;
        this.panierOpen = true;

        if (this.isParent() && !this.enfantsLoaded) this.loadEnfants();

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

  // ======= Panier =======
  supprimerDuPanier(index: number): void {
    const copy = [...this.panier];
    copy.splice(index, 1);
    this.panierService.setPanier(copy as unknown as Produit[]);
  }

  // ======= Enfants / Bénéficiaire =======
  private async loadEnfants(): Promise<void> {
    try {
      const list = await this.getEnfantsParent();
      this.enfants = list ?? [];
      this.enfantsLoaded = true;
      this.applyBeneficiaryDefault();
    } catch (e) {
      console.error('[Header] loadEnfants error:', e);
      this.enfants = [];
      this.enfantsLoaded = true;
    }
  }

  private applyBeneficiaryDefault(): void {
    if (!this.isParent() || this.enfants.length !== 1) return;
    const uniqueChildId = this.enfants[0].id;
    const copy: PanierItem[] = this.panier.map((it) =>
      it.beneficiaireId == null ? { ...it, beneficiaireId: uniqueChildId } : it
    );
    this.panier = copy;
    this.panierService.setPanier(copy as unknown as Produit[]);
  }

  private async getEnfantsParent(): Promise<any[]> {
    try {
      const obs = this.http.get<any[]>(`${this.API_BASE}/membres/mes-enfants`);
      const response = await firstValueFrom(obs);
      return response || [];
    } catch (error) {
      console.error('[Header] Erreur récupération enfants:', error);
      return [];
    }
  }

  // ======= Récup MembreId =======
  private async getMonMembreId(): Promise<number | null> {
    const raw: any = this.user as any;
    if (raw?.membreId) return Number(raw.membreId);

    const uid = this.user?.id;
    if (!uid) return null;

    try {
      const dto: any = await firstValueFrom(
        this.http.get(`${this.API_BASE}/membres/by-utilisateur/${uid}`)
      );
      if (dto && dto.id) return Number(dto.id);
    } catch {}

    try {
      const list: any[] = await firstValueFrom(
        this.http.get<any[]>(`${this.API_BASE}/membres?utilisateurId=${uid}`)
      );
      if (Array.isArray(list) && list.length > 0 && list[0]?.id) return Number(list[0].id);
    } catch {}

    return null;
  }

  private async resolveMembreIdPourAchat(): Promise<number | null> {
    if (this.isParent()) {
      if (!this.enfantsLoaded) await this.loadEnfants();

      const ids = Array.from(
        new Set((this.panier as any[]).map(i => (i as any).beneficiaireId).filter((x: any) => x != null))
      ) as number[];

      if (ids.length === 1) return ids[0];
      if (ids.length === 0 && this.enfants.length === 1) return this.enfants[0].id;

      if (ids.length === 0 && this.enfants.length > 1) {
        alert('Sélectionne un bénéficiaire (enfant) pour au moins un article.');
        return null;
      }
      if (ids.length >= 1) return ids[0];
      return null;
    }

    const mid = await this.getMonMembreId();
    if (!mid) {
      alert('Impossible de retrouver votre identifiant de membre.');
      return null;
    }
    return mid;
  }

  // ======= Helpers prix =======
  private unitPriceOf(item: PanierItem): number {
    const total = Number((item as any).prix ?? 0);
    if (total && item.quantite) return +(total / item.quantite).toFixed(2);
    const pu = Number((item as any).prixUnitaire ?? 0);
    return pu || 0;
  }

  // ======= Paiement CB (Stripe) =======
  async payerParCB(): Promise<void> {
    if (!this.isLoggedIn) {
      this.pendingOpenCart = true;
      this.pendingStartPay = true;
      this.openConnexionModal();
      return;
    }
    if (this.panier.length === 0) {
      alert('Le panier est vide. Ajoutez des produits avant de procéder au paiement.');
      return;
    }

    if (this.isParent() && !this.enfantsLoaded) {
      await this.loadEnfants();
    }

    try {
      const membreId = await this.resolveMembreIdPourAchat();
      if (!membreId) return;

      const items = this.panier.map((raw: PanierItem) => {
        let benId: number | null = raw.beneficiaireId ?? null;
        if (benId == null && this.isParent() && this.enfants.length === 1) {
          benId = this.enfants[0].id;
        }
        return {
          produitId: raw.id,
          quantite: raw.quantite,
          taille: raw.taille ?? null,
          couleur: raw.couleur ?? null,
          flocageActif: (raw as any).flocageActif ?? false,
          flocage: (raw as any).flocage ?? null,
          beneficiaireId: benId,
        };
      });

      const requestBody: any = { membreId, modePaiement: 'stripe', items };

      const createResponse = await firstValueFrom(
        this.http.post<any>(`${this.API_BASE}/paiements/from-cart`, requestBody)
      );

      const paiementId = createResponse?.paiementId;
      if (!paiementId) throw new Error('Impossible de créer le paiement');

      this.showPaiementModal = true;
      await Promise.resolve();

      await this.stripeService.ensureStripe();
      await this.stripeService.monterElementDans('#modal-card-element');
      await this.stripeService.createPaymentIntent({
        paiementId,
        customerEmail: this.user?.email || undefined,
      });
    } catch (e: any) {
      this.showPaiementModal = false;
      console.error('[Header] Erreur préparation paiement:', e);
      const msg = e?.error?.error || e?.message || 'Erreur lors de la préparation du paiement.';
      alert(msg);
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
      console.warn('[Header] paiement non confirmé:', res);
      alert(res.message || 'Paiement non confirmé.');
    }
  }

  fermerPaiementModal(): void {
    this.showPaiementModal = false;
    this.stripeService.unmount();
  }

  // ======= Paiement au club =======
  async payerAuClub(): Promise<void> {
    if (!this.isLoggedIn) {
      this.pendingOpenCart = true;
      this.openConnexionModal();
      return;
    }
    if (this.panier.length === 0) return;

    if (this.isParent() && !this.enfantsLoaded) {
      await this.loadEnfants();
    }

    const lignes = this.panier.map((p: PanierItem) => {
      const prixUnitaire = this.unitPriceOf(p);
      const sousTotal = +(prixUnitaire * (p.quantite || 1)).toFixed(2);
      
      // ✅ Calcul du bénéficiaire (même logique que pour CB)
      let benId: number | null = p.beneficiaireId ?? null;
      if (benId == null && this.isParent() && this.enfants.length === 1) {
        benId = this.enfants[0].id;
      }
      
      return {
        produitId: p.id,
        quantite: p.quantite,
        prixUnitaire,
        sousTotal,
        taille: p.taille ?? null,
        couleur: p.couleur ?? null,
        flocage: (p as any).flocage ?? null,
        beneficiaireId: benId, // ✅ AJOUT du bénéficiaire manquant
      };
    });
    const montantTotal = lignes.reduce((s: number, l: any) => s + Number(l.sousTotal || 0), 0);

    const payloadFull: any = {
      utilisateurId: this.user?.id ?? null,
      modePaiement: 'CLUB',
      statut: 'EN_ATTENTE',
      dateCommande: new Date().toISOString().slice(0, 10),
      montantTotal,
      lignesCommande: lignes,
    };

    try {
      await firstValueFrom(
        this.http.post(`${this.API_BASE}/commandes/with-lignes`, payloadFull)
      );
      this.confirmationMessage = '🧾 Commande enregistrée. Veuillez régler au club.';
      this.showConfirmationModal = true;
      this.panierService.viderPanier();
      return;
    } catch (e1: any) {
      console.warn('[Header] /api/commandes/with-lignes indisponible', e1);
    }

    try {
      await firstValueFrom(
        this.http.post(`${this.API_BASE}/commandes`, payloadFull)
      );
      this.confirmationMessage = '🧾 Commande enregistrée. Veuillez régler au club.';
      this.showConfirmationModal = true;
      this.panierService.viderPanier();
      return;
    } catch (e2: any) {
      console.warn('[Header] /api/commandes KO', e2);
    }

    try {
      const minimal: any = {
        utilisateurId: this.user?.id ?? null,
        modePaiement: 'CLUB',
        lignesCommande: lignes,
      };
      await firstValueFrom(
        this.http.post(`${this.API_BASE}/commandes`, minimal)
      );
      this.confirmationMessage = '🧾 Commande enregistrée. Veuillez régler au club.';
      this.showConfirmationModal = true;
      this.panierService.viderPanier();
    } catch (e3: any) {
      console.error('[Header] création commande CLUB KO:', e3);
      alert(e3?.error?.message || 'Impossible de créer la commande au club.');
    }
  }

  // ======= Modales =======
  closeAllModals(): void {
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

  // ======= Notifications =======
  toggleNotifications(): void {
    this.notificationsOpen = !this.notificationsOpen;
    // Fermer les autres dropdowns
    if (this.notificationsOpen) {
      this.userDropdownOpen = false;
      this.panierOpen = false;
    }
  }

  closeNotifications(): void {
    this.notificationsOpen = false;
  }

  loadNotifications(): void {
    // Charger les notifications depuis votre backend
    console.log('🔔 Chargement des notifications depuis le backend...');
    this.http.get<any[]>(`${this.API_BASE}/notifications`).subscribe({
      next: (notifications) => {
        console.log('✅ Notifications reçues:', notifications);
        this.notifications = notifications;
        this.unreadCount = notifications.filter(n => !n.lu).length;
      },
      error: (err) => {
        console.error('❌ Erreur lors du chargement des notifications:', err);
        // Pas de fallback - si pas de backend, pas de notifications
        this.notifications = [];
        this.unreadCount = 0;
      }
    });
  }

  markAsRead(notification: any): void {
    if (!notification.lu) {
      notification.lu = true;
      this.unreadCount--;
      
      // Envoyer au backend
      this.http.put(`${this.API_BASE}/notifications/${notification.id}/read`, {}).subscribe({
        error: (err) => console.error('Erreur lors du marquage comme lu:', err)
      });
    }
  }

  markAllAsRead(): void {
    this.notifications.forEach(n => n.lu = true);
    this.unreadCount = 0;
    
    // Envoyer au backend
    this.http.put(`${this.API_BASE}/notifications/mark-all-read`, {}).subscribe({
      error: (err) => console.error('Erreur lors du marquage global:', err)
    });
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'cours': return 'ri-calendar-line';
      case 'paiement': return 'ri-money-euro-circle-line';
      case 'examen': return 'ri-medal-line';
      default: return 'ri-notification-line';
    }
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
  }
}
