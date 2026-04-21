import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { StripeService } from '../../services/stripe.service';
import { ParametresPaiementService } from '../../services/parametres-paiement.service';
import { AuthService } from '../../services/auth.service';
import { MembreService } from '../../services/membre.service';
import { PaiementService } from '../../services/paiement.service';
import { environment } from '../../../environments/environment';

type TypePaiement = 'UNIQUE' | 'ECHELONNE';
type HistoryFilter = 'AUTO' | 'ECHELONNE' | 'UNIQUE';
type MainTab = 'PAYER' | 'HISTO';

@Component({
  selector: 'app-paiement-parent',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './paiement-parent.component.html',
  styleUrls: ['./paiement-parent.component.css']
  
})
export class PaiementParentComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly API = environment.apiUrl;

  // Onglets
  activeTab: MainTab = 'PAYER';

  // Wizard
  step = 1;
  maxStep = 4;

  // Enfants
  enfants: { id: number; nom: string; prenom: string }[] = [];
  enfantSelectionne: number | null = null;
  enfantSelectionneNom = '';

  // Historique paiements
  paiements: any[] = [];
  paiementsUniques: any[] = [];
  paiementsEcheances: any[] = [];

  // Paramètres
  montantInitial = 0;
  typeChoisi: TypePaiement = 'UNIQUE';
  nombreEcheances = 1;
  echeancesOptions: number[] = [];
  readonly modePaiement = 'CB';

  // Stripe
  stripe: any = null;
  cardElement: any = null;               // carte (modale principale)
  cardElementParentModal: any = null;    // carte (modale échéance)

  // États paiement
  enCoursDePaiement = false;
  paiementReussi = false;
  paiementErreur = false;
  erreurMessage = '';

  // Ids utiles
  paiementIdEnCours: number | null = null;
  private lastPaymentIntentId: string | null = null;

  // Anti double-clic
  private confirming = false;

  // Modal échéance (historique)
  modalOuverte = false;
  paiementActuel: any = null;
  echeanceEnCours: any = null;
  montantTotalAPayer = 0;

  // —— Modale carte principale (checkout) ——
  modalCarteOuverte = false;
  cartePrete = false;          // flag interne: carte saisie OK
  stripeReady = false;         // Stripe Element monté
  private stripeElementMounted = false; // éviter double montage

  // Affichage “échéances payées” par plan
  private showPaidByPlanId: Record<number, boolean> = {};

  // Bandeau “À régler”
  nextDue: { enfant: any; plan: any; echeance: any } | null = null;

  // Filtre historique
  historyFilter: HistoryFilter = 'AUTO';

  // Confirmation (Step 4)
  factureUrl: string | null = null;
  paymentDate: Date | null = null;
  montantPaye = 0;

  // Email client pour reçu Stripe (opt-in visible comme côté Membre)
  envoyerRecuEmail: boolean = false;
  userEmail = '';

  // Utilisé par le template
  today: Date = new Date();

  constructor(
    private stripeService: StripeService,
    private parametresService: ParametresPaiementService,
    private authService: AuthService,
    private membreService: MembreService,
    private paiementService: PaiementService
  ) {}

  // ===== Utils
  private authHeaders() {
    return this.authService.getAuthHeaders();
  }
  private getCurrentUserId(): number | undefined {
    return this.authService.getUtilisateurConnecte()?.id ?? this.authService.getUserIdFromToken() ?? undefined;
  }
  private refreshUserEmail(): void {
    this.userEmail = (this.authService.getUtilisateurConnecte()?.email ?? '').trim();
  }
  // private log supprimé
  private isPaid(s: any) { return /pay[eé]e?/i.test(String(s ?? '')); }
  private extractPiIdFromClientSecret(clientSecret?: string | null): string | null {
    if (!clientSecret) return null;
    const i = clientSecret.indexOf('_secret_'); return i > 0 ? clientSecret.substring(0, i) : null;
    }
  private buildFactureUrl(paiementId: number){
    return `${this.API}/paiements/${paiementId}/facture`;
  }
  telechargerFacture(): void {
    const pid = this.paiementIdEnCours;
    if (!pid) return;
    this.paiementService.getFactureUrl(pid)
      .subscribe({ next: r => { if (r?.receiptUrl) window.open(r.receiptUrl, '_blank', 'noopener'); }, error: () => {} });
  }

  canOpenStripeReceipt(): boolean {
    return !!this.paiementIdEnCours;
  }

  openStripeReceipt(): void {
    const pid = this.paiementIdEnCours;
    if (!pid) return;
    this.stripeService.getReceiptUrl(pid).then(url => {
      if (url) window.open(url, '_blank', 'noopener');
    });
  }

  ouvrirRecuStripe(paiementId: number): void {
    if (!paiementId) return;
    this.stripeService.getReceiptUrl(paiementId).then(url => {
      if (url) {
        window.open(url, '_blank', 'noopener');
      } else {
        this.paiementErreur = true;
        this.erreurMessage = 'Le reçu n\'est pas encore disponible. Veuillez réessayer dans quelques instants.';
      }
    });
  }

  private async syncPaymentIntentOnce(): Promise<void> {
    if (!this.lastPaymentIntentId) return;
    try {
      await this.stripeService.syncPayment(this.lastPaymentIntentId);
    } catch (e) { /* ignore */ }
  }
  // ===== Cycle de vie
  ngOnInit(): void {
    this.refreshUserEmail();
    this.parametresService.parametres$.subscribe((p) => {
  // ...log supprimé...
      if (p) {
        this.montantInitial = Number(p.montantCotisation || 0);

        const maxEch = Math.max(1, Number(p.echeancesAutorisees || 1));
        // ⚠️ options à partir de 2 (on enlève "1")
        this.echeancesOptions = maxEch > 1
          ? Array.from({ length: maxEch - 1 }, (_, i) => i + 2)
          : [];

        if (this.typeChoisi === 'ECHELONNE') {
          if (this.echeancesOptions.length) {
            if (this.nombreEcheances < 2) this.nombreEcheances = this.echeancesOptions[0];
          } else {
            this.typeChoisi = 'UNIQUE';
            this.nombreEcheances = 1;
          }
        } else {
          this.nombreEcheances = 1;
        }
      }
      this.loadEnfants();
    });
  }

  ngAfterViewInit(): void {
    // Stripe est monté uniquement dans les modales
  }

  ngOnDestroy(): void {
    try { if (this.cardElement) this.cardElement.unmount(); } catch {}
    try { if (this.cardElementParentModal) this.cardElementParentModal.unmount(); } catch {}
    this.cardElement = null;
    this.cardElementParentModal = null;
    this.stripeElementMounted = false;
    this.stripeReady = false;
  }

  // ===== Chargements
  loadEnfants(): void {
    if (!this.authService.getToken()) return;

    this.membreService.getMembresPourParentConnecte().subscribe({
      next: (data: any) => {
        this.enfants = data || [];
        if (this.enfants.length === 1) this.selectMembre(this.enfants[0]);
        this.loadPaiements();
      },
      error: (err: any) => console.error('❌ [Enfants] Erreur:', err)
    });
  }

  loadPaiements(): void {
    if (!this.authService.getToken()) return;

    this.paiementService.getMesPaiementsParent().subscribe({
      next: (data) => {
  // ...log supprimé...
        const mapped = (data || []).map(p => {
          const type = String(p?.type ?? '').toUpperCase();
          const mode = String(p?.modePaiement ?? p?.mode ?? '').toUpperCase();
          const { statutDisplay, statutCss } = this.normalizeStatut(p?.statut);
          const membreId = Number(p?.membreId ?? p?.membre?.id ?? p?.beneficiaireId ?? p?.enfantId ?? NaN);

          const echeances = Array.isArray(p?.echeances)
            ? p.echeances.map((e: any) => {
                const { statutDisplay: eDisp, statutCss: eCss } = this.normalizeStatut(e?.statut);
                return {
                  ...e,
                  dateAffichable: new Date(e?.dateEcheance ?? e?.date ?? Date.now()),
                  statutDisplay: eDisp,
                  statutCss: eCss
                };
              }).sort((a: any, b: any) => (a?.numero ?? 0) - (b?.numero ?? 0))
            : [];

          return { ...p, membreId, type, modePaiement: mode, statutDisplay, statutCss, echeances };
        });

        this.paiements = mapped;
        this.mettreAJourFiltresPaiements();
        this.refreshNextDue();
      },
      error: (err) => console.error('❌ [Paiements] Erreur:', err)
    });
  }

  private normalizeStatut(raw: any) {
    const s = String(raw ?? '')
      .normalize('NFD').replace(/\p{Diacritic}/gu, '')
      .toLowerCase().trim();
    if (['paye','payé','payee','payée'].includes(s)) return { statutDisplay: 'payé', statutCss: 'status--success' };
    if (['annule','annulé'].includes(s)) return { statutDisplay: 'annulé', statutCss: 'status--danger' };
    return { statutDisplay: 'en attente', statutCss: 'status--warning' };
  }

  mettreAJourFiltresPaiements(): void {
    this.paiementsUniques   = this.paiements.filter(p => p.type === 'UNIQUE');
    this.paiementsEcheances = this.paiements.filter(p => p.type === 'ECHELONNE');
  }

  // ===== Sélecteurs / helpers historique
  getPaiementsUniquesPourEnfant(enfantId: number){ return this.paiementsUniques.filter(p => p.membreId === enfantId); }
  getPaiementsEcheancesPourEnfant(enfantId: number){ return this.paiementsEcheances.filter(p => p.membreId === enfantId); }
  getFirstPlan(enfantId: number){ const list = this.getPaiementsEcheancesPourEnfant(enfantId); return list?.[0] || null; }
  hasPlans(enfantId: number){ return this.getPaiementsEcheancesPourEnfant(enfantId).length > 0; }
  hasUniques(enfantId: number){ return this.getPaiementsUniquesPourEnfant(enfantId).length > 0; }

  setHistoryFilter(v: HistoryFilter){ this.historyFilter = v; }
  shouldShowPlanFor(enfantId: number){
    if (this.historyFilter === 'ECHELONNE') return this.hasPlans(enfantId);
    if (this.historyFilter === 'UNIQUE') return false;
    return this.hasPlans(enfantId);
  }
  shouldShowUniquesFor(enfantId: number){
    if (this.historyFilter === 'UNIQUE') return true;
    if (this.historyFilter === 'ECHELONNE') return false;
    return !this.hasPlans(enfantId);
  }

  nextUnpaid(paiement: any){ const list = Array.isArray(paiement?.echeances) ? paiement.echeances : []; return list.find((e: any) => (e?.statutCss || '') !== 'status--success') || null; }
  unpaidEcheances(paiement: any){ const list = Array.isArray(paiement?.echeances) ? paiement.echeances : []; return list.filter((e: any) => (e?.statutCss || '') !== 'status--success'); }
  paidEcheances(paiement: any){ const list = Array.isArray(paiement?.echeances) ? paiement.echeances : []; return list.filter((e: any) => (e?.statutCss || '') === 'status--success'); }
  toggleShowPaid(planId: number){ this.showPaidByPlanId[planId] = !this.showPaidByPlanId[planId]; }
  isShowPaid(planId: number){ return !!this.showPaidByPlanId[planId]; }
  paidCount(paiement: any){ return this.paidEcheances(paiement).length; }
  progressPercent(paiement: any){ const total = Array.isArray(paiement?.echeances) ? paiement.echeances.length : 0; if (!total) return 0; return Math.round((this.paidCount(paiement) / total) * 100); }
  calculerMontantRestant(paiement: any): number{
    if (!Array.isArray(paiement?.echeances) || paiement.echeances.length === 0) return Number(paiement?.montantTotal || 0);
    const paye = paiement.echeances
      .filter((e: any) => (e?.statutCss || '') === 'status--success')
      .reduce((sum: number, e: any) => sum + Number(e?.montant || 0), 0);
    return Math.max(0, Number(paiement?.montantTotal || 0) - paye);
  }

  // ===== Bandeau “À régler”
  private refreshNextDue(){
    let best: { enfant: any; plan: any; echeance: any } | null = null;
    for (const enfant of this.enfants) {
      const plans = this.getPaiementsEcheancesPourEnfant(enfant.id);
      for (const plan of plans) {
        const due = this.nextUnpaid(plan);
        if (!due || !due.dateAffichable) continue;
        if (!best) best = { enfant, plan, echeance: due };
        else {
          const tBest = new Date(best.echeance.dateAffichable).getTime();
          const tDue  = new Date(due.dateAffichable).getTime();
          if (tDue < tBest) best = { enfant, plan, echeance: due };
        }
      }
    }
    this.nextDue = best;
  }
  daysUntil(e:any): number{
    if (!e?.dateAffichable) return 9999;
    const today = new Date();
    const floorToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const d = new Date(e.dateAffichable);
    return Math.floor((d.getTime() - floorToday.getTime()) / 86400000);
  }
  dueState(e:any): 'late'|'soon'|'upcoming'{
    const n = this.daysUntil(e); if (n < 0) return 'late'; if (n <= 7) return 'soon'; return 'upcoming';
  }
  dueTitle(e:any): string{ const s = this.dueState(e); if (s === 'late') return 'En retard'; if (s === 'soon') return 'À régler'; return 'Prochaine échéance'; }
  daysLabel(n:number): string{ if (n < 0) return `${Math.abs(n)} j de retard`; if (n === 0) return `— aujourd'hui`; if (n === 1) return `— demain`; return `— dans ${n} jours`; }

  // ===== Mode de paiement (Étape 2)
  setMode(mode: TypePaiement) {
  // ...log supprimé...
    this.typeChoisi = mode;

    if (mode === 'ECHELONNE') {
      if (!this.echeancesOptions.length) {
        this.typeChoisi = 'UNIQUE';
        this.nombreEcheances = 1;
      } else if (this.nombreEcheances < 2) {
        this.nombreEcheances = this.echeancesOptions[0]; // min=2
      }
    } else {
      this.nombreEcheances = 1; // neutre pour UNIQUE
    }
  }

  onEcheancesFocusOrChange() {
    // si l'utilisateur touche le select, passe automatiquement en ECHELONNE
    this.setMode('ECHELONNE');
  }

  // ===== Wizard
  nextStep(): void{
    if (this.step < this.maxStep) {
      this.step++;
      if (this.step === 3) {
        this.montantTotalAPayer = this.getMontantParEcheance();
        this.cartePrete = false;
  // ...log supprimé...
      }
    }
  }
  previousStep(): void{ if (this.step > 1) this.step--; }
  selectMembre(membre: { id: number; nom: string; prenom: string }): void{
    this.enfantSelectionne = membre.id;
    this.enfantSelectionneNom = `${membre.prenom} ${membre.nom}`;
  // ...log supprimé...
  }

  // ===== Modale carte principale (checkout)
  ouvrirModalCarte(): void {
  // ...log supprimé...
    this.modalCarteOuverte = true;
    setTimeout(() => this.mountStripeOn('card-element-main-modal'), 0);
  }
  fermerModalCarte(): void {
  // ...log supprimé...
    this.modalCarteOuverte = false;
    this.resetStripeMainElement();
  }

  /**
   * Bouton "Payer" dans la modale principale :
   * - la carte est saisie dans la modale
   * - on lance le paiement immédiatement
   * - on passe à la confirmation (step 4) si OK
   */
  validerCarte(): void {
  // ...log supprimé...
    this.cartePrete = true;
    this.enCoursDePaiement = true;
    this.initierPaiement(true); // true => depuis la modale
  }

  private async mountStripeOn(targetId: string): Promise<void> {
    if (this.stripeElementMounted) {
      console.log('[Stripe][parent] mountStripeOn.alreadyMounted', targetId);
      this.stripeReady = true;
      return;
    }
    const container = document.getElementById(targetId);
    if (!container) {
      console.error('[Stripe][parent] Container introuvable pour', targetId);
      return;
    }
    try {
      console.log('[Stripe][parent] mountStripeOn.start', targetId);
      const stripe = await this.stripeService.getStripeInstance();
      if (!stripe) {
        console.error('[Stripe][parent] Stripe non initialisé');
        this.stripeReady = false;
        return;
      }
      this.stripe = stripe;
      const elements = this.stripe.elements();
      if (this.cardElement) {
        try {
          this.cardElement.unmount();
          console.log('[Stripe][parent] mountStripeOn.unmountOld');
        } catch (err) {
          console.log('[Stripe][parent] mountStripeOn.unmountOld.err', err);
        }
      }
      this.cardElement = elements.create('card');
      console.log('[Stripe][parent] mountStripeOn.createCardElement', this.cardElement);
      this.cardElement.mount(`#${targetId}`);
      console.log('[Stripe][parent] mountStripeOn.mounted', targetId);
      this.stripeElementMounted = true;
      this.stripeReady = true;
      this.cardElement.on('change', (event: any) => {
        console.log('[Stripe][parent] mountStripeOn.cardChange', event);
        if (event.error) console.error('[Stripe][parent] Erreur saisie:', event.error.message);
      });
    } catch (e) {
      console.error('[Stripe][parent] Erreur lors du montage Stripe:', e);
      this.stripeReady = false;
    }
  }

  /** Démonte l'élément Stripe principal pour un nouveau cycle propre */
  private resetStripeMainElement(): void {
    try { if (this.cardElement) this.cardElement.unmount(); } catch {}
    this.cardElement = null;
    this.stripeElementMounted = false;
    this.stripeReady = false;
  }

  // ===== Création + confirmation paiement (checkout principal)
  async initierPaiement(fromModal = false): Promise<void> {
    if ((this.enCoursDePaiement && this.confirming) && !fromModal) return;
    if (!this.enfantSelectionne) return;

    if (!this.cartePrete || !this.cardElement) {
      this.paiementErreur = true;
      this.erreurMessage = 'Veuillez saisir votre carte dans la fenêtre sécurisée.';
      return;
    }

    this.enCoursDePaiement = true; this.confirming = true;
    this.paiementErreur = false; this.erreurMessage = '';

    try {
      const utilisateurId = this.getCurrentUserId();
      const dtoCreation = {
        membreId: this.enfantSelectionne,
        type: this.typeChoisi,
        modePaiement: this.modePaiement,
        montantTotal: this.montantInitial,
        nombreEcheances: this.typeChoisi === 'ECHELONNE' ? this.nombreEcheances : 1,
        utilisateurId
      };

      const creationRes = await firstValueFrom(this.paiementService.ajouterPaiementParent(dtoCreation));

      const paiementId = creationRes?.id ?? creationRes?.paiementId;
      if (!paiementId) { this.failPaiement('ID de paiement introuvable après création'); return; }
      this.paiementIdEnCours = Number(paiementId);
      this.factureUrl = creationRes?.factureUrl || this.buildFactureUrl(this.paiementIdEnCours);
      this.montantPaye = this.getMontantAPayerMaintenant();

      let echeanceIdToPay: number | undefined = undefined;
      if (Array.isArray(creationRes?.echeances)) {
        const firstUnpaid = (creationRes.echeances as any[])
          .sort((a: any, b: any) => (a?.numero ?? 0) - (b?.numero ?? 0))
          .find((e: any) => !this.isPaid(e?.statut));
        echeanceIdToPay = firstUnpaid?.id;
      }

      const piPayload: any = { paiementId: this.paiementIdEnCours, sendReceiptEmail: this.envoyerRecuEmail };
      if (this.envoyerRecuEmail && this.userEmail) piPayload.customerEmail = this.userEmail;
      if (echeanceIdToPay) piPayload.echeanceId = echeanceIdToPay;

      const resPI = await this.stripeService.createPaymentIntent(piPayload);
      const clientSecret = resPI?.clientSecret;
      this.lastPaymentIntentId = resPI?.paymentIntentId ?? this.extractPiIdFromClientSecret(clientSecret);
      if (!clientSecret) { this.failPaiement('Client secret Stripe manquant'); return; }
      if (!this.stripe) { this.failPaiement('Stripe non initialisé'); return; }

      const result = await this.stripe.confirmCardPayment(clientSecret, { payment_method: { card: this.cardElement } });
      if (result?.error) { this.failPaiement(result.error.message || 'Erreur de paiement'); return; }

      await this.syncPaymentIntentOnce();
      this.paymentDate = new Date();
      if (fromModal) this.modalCarteOuverte = false;
      this.paiementReussi = true;
      this.enCoursDePaiement = false;
      this.confirming = false;
      this.step = 4;
      this.loadPaiements();
      this.resetStripeMainElement();
    } catch (e: any) {
      this.failPaiement(e?.message || 'Erreur lors du paiement');
    } finally {
      this.confirming = false;
    }
  }

  private failPaiement(msg: string){
    this.erreurMessage = msg;
    this.paiementErreur = true;
    this.enCoursDePaiement = false;
  // ...log supprimé...
  }

  // ===== Paiement d'échéance (historique)
  ouvrirModalPaiement(paiement: any, echeance: any): void{
    if (!paiement || !echeance) return;
    if ((echeance?.statutCss || '') === 'status--success') return;

    this.paiementActuel = paiement; this.echeanceEnCours = echeance;
    this.montantTotalAPayer = Number(echeance?.montant || 0); this.modalOuverte = true;

    setTimeout(() => this.initStripeElementParentModal(), 200);
  }
  fermerModalPaiement(): void{
    this.modalOuverte = false; this.paiementActuel = null; this.echeanceEnCours = null; this.montantTotalAPayer = 0;
    if (this.cardElementParentModal) { try { this.cardElementParentModal.unmount(); } catch {} this.cardElementParentModal = null; }
  }
  private initStripeElementParentModal(): void{
    const container = document.querySelector('#card-element-parent-modal'); if (!container) return;
    this.stripeService.getStripeInstance().then((stripe: any) => {
      this.stripe = stripe; const elements = stripe.elements();
      if (this.cardElementParentModal) { try { this.cardElementParentModal.unmount(); } catch {} }
      this.cardElementParentModal = elements.create('card'); this.cardElementParentModal.mount('#card-element-parent-modal');
  // ...log supprimé...
    });
  }
  async payerEcheances(): Promise<void> {
    if (this.enCoursDePaiement || this.confirming) return;
    if (!this.paiementActuel || !this.cardElementParentModal || !this.echeanceEnCours) return;

    this.enCoursDePaiement = true; this.confirming = true;
    this.paiementErreur = false; this.erreurMessage = '';

    try {
      const paiementId = Number(this.paiementActuel?.id || this.paiementActuel?.paiementId);
      const echeanceId = Number(this.echeanceEnCours?.id);
      const payload: any = { paiementId, echeanceId, sendReceiptEmail: this.envoyerRecuEmail };
      if (this.envoyerRecuEmail && this.userEmail) payload.customerEmail = this.userEmail;

      const resPI = await this.stripeService.createPaymentIntent(payload);
      const clientSecret = resPI?.clientSecret;
      this.lastPaymentIntentId = resPI?.paymentIntentId ?? this.extractPiIdFromClientSecret(clientSecret);
      if (!clientSecret) { this.failPaiement('Client secret Stripe manquant'); return; }
      if (!this.stripe) { this.failPaiement('Stripe non initialisé'); return; }

      const result = await this.stripe.confirmCardPayment(clientSecret, { payment_method: { card: this.cardElementParentModal } });
      this.enCoursDePaiement = false;
      if (result?.error) { this.paiementErreur = true; this.erreurMessage = result.error.message || 'Erreur de paiement'; return; }

      await this.syncPaymentIntentOnce();
      this.paiementReussi = true;
      this.fermerModalPaiement();
      this.loadPaiements();
    } catch (e: any) {
      this.failPaiement(e?.message || 'Exception lors de la confirmation Stripe');
    } finally {
      this.confirming = false;
    }
  }

  // ===== Aides montants
  getMontantParEcheance(): number{
    if (this.typeChoisi !== 'ECHELONNE' || this.nombreEcheances < 2) return this.montantInitial;
    return this.montantInitial / this.nombreEcheances;
  }
  getMontantAPayerMaintenant(): number{
    return this.typeChoisi === 'ECHELONNE' && this.nombreEcheances >= 2
      ? this.getMontantParEcheance()
      : this.montantInitial;
  }
  labelEcheances(n:number){ return n===1 ? '1 échéance' : `${n} échéances`; }
}
