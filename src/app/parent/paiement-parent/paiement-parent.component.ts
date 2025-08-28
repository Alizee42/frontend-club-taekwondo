import { Component, OnInit, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { StripeService } from '../../services/stripe.service';
import { ParametresPaiementService } from '../../services/parametres-paiement.service';

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
export class PaiementParentComponent implements OnInit, AfterViewInit {
  private readonly API = '/api';

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
  stripe: any;
  cardElement: any;
  cardElementParentModal: any;

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

  // Modal échéance (parent)
  modalOuverte = false;
  paiementActuel: any = null;
  echeanceEnCours: any = null;
  montantTotalAPayer = 0;

  // Affichage “échéances payées” par plan
  private showPaidByPlanId: Record<number, boolean> = {};

  // Bandeau global “À régler”
  nextDue: { enfant: any; plan: any; echeance: any } | null = null;

  // Filtre historique
  historyFilter: HistoryFilter = 'AUTO';

  constructor(
    private http: HttpClient,
    private stripeService: StripeService,
    private parametresService: ParametresPaiementService
  ) {}

  ngOnInit(): void {
    this.parametresService.parametres$.subscribe((p) => {
      if (p) {
        this.montantInitial = Number(p.montantCotisation || 0);
        const maxEch = Math.max(1, Number(p.echeancesAutorisees || 1));
        this.echeancesOptions = Array.from({ length: maxEch }, (_, i) => i + 1);
        this.nombreEcheances = this.typeChoisi === 'ECHELONNE' ? maxEch : 1;
      }
      this.loadEnfants();
    });
  }

  ngAfterViewInit(): void {
    // Stripe monté à l’étape 3 et dans la modale
  }

  // Utils
  private authHeaders() {
    const token = localStorage.getItem('token') || '';
    return { Authorization: `Bearer ${token}` };
  }
  private log(where: string, payload?: any) { console.log(`[Parent][${where}]`, payload ?? ''); }
  private isPaid(s: any) { return /pay[eé]e?/i.test(String(s ?? '')); }
  private extractPiIdFromClientSecret(clientSecret?: string | null): string | null {
    if (!clientSecret) return null;
    const i = clientSecret.indexOf('_secret_'); return i > 0 ? clientSecret.substring(0, i) : null;
  }
  private async syncPaymentIntentOnce(): Promise<void> {
    if (!this.lastPaymentIntentId) return;
    try {
      await firstValueFrom(this.http.post(`${this.API}/stripe/sync-payment`,
        { paymentIntentId: this.lastPaymentIntentId }, { headers: this.authHeaders() }));
      this.log('sync-payment.ok');
    } catch (e) { this.log('sync-payment.err', e); }
    finally { this.lastPaymentIntentId = null; }
  }

  // Chargements
  loadEnfants(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<{ id: number; nom: string; prenom: string }[]>(
      `${this.API}/membres/mes-enfants`,
      { headers: this.authHeaders() }
    ).subscribe({
      next: (data) => {
        this.enfants = data || [];
        if (this.enfants.length === 1) this.selectMembre(this.enfants[0]);
        this.loadPaiements();
      },
      error: (err) => console.error('❌ [Enfants] Erreur:', err)
    });
  }

  loadPaiements(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<any[]>(`${this.API}/paiements/parent/mes-paiements`, {
      headers: this.authHeaders()
    }).subscribe({
      next: (data) => {
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

    if (s === 'paye' || s === 'payé' || s === 'payee' || s === 'payée') return { statutDisplay: 'payé', statutCss: 'badge-payé' };
    if (s === 'annule' || s === 'annulé') return { statutDisplay: 'annulé', statutCss: 'badge-annulé' };
    return { statutDisplay: 'en attente', statutCss: 'badge-en-attente' };
  }

  mettreAJourFiltresPaiements(): void {
    this.paiementsUniques   = this.paiements.filter(p => p.type === 'UNIQUE');
    this.paiementsEcheances = this.paiements.filter(p => p.type === 'ECHELONNE');
  }

  // Sélecteurs / helpers
  getPaiementsUniquesPourEnfant(enfantId: number){ return this.paiementsUniques.filter(p => p.membreId === enfantId); }
  getPaiementsEcheancesPourEnfant(enfantId: number){ return this.paiementsEcheances.filter(p => p.membreId === enfantId); }
  getFirstPlan(enfantId: number){ const list = this.getPaiementsEcheancesPourEnfant(enfantId); return list?.[0] || null; }
  hasPlans(enfantId: number){ return this.getPaiementsEcheancesPourEnfant(enfantId).length > 0; }

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

  nextUnpaid(paiement: any){ const list = Array.isArray(paiement?.echeances) ? paiement.echeances : []; return list.find((e: any) => (e?.statutCss || '') !== 'badge-payé') || null; }
  unpaidEcheances(paiement: any){ const list = Array.isArray(paiement?.echeances) ? paiement.echeances : []; return list.filter((e: any) => (e?.statutCss || '') !== 'badge-payé'); }
  paidEcheances(paiement: any){ const list = Array.isArray(paiement?.echeances) ? paiement.echeances : []; return list.filter((e: any) => (e?.statutCss || '') === 'badge-payé'); }
  toggleShowPaid(planId: number){ this.showPaidByPlanId[planId] = !this.showPaidByPlanId[planId]; }
  isShowPaid(planId: number){ return !!this.showPaidByPlanId[planId]; }
  paidCount(paiement: any){ return this.paidEcheances(paiement).length; }
  progressPercent(paiement: any){ const total = Array.isArray(paiement?.echeances) ? paiement.echeances.length : 0; if (!total) return 0; return Math.round((this.paidCount(paiement) / total) * 100); }
  calculerMontantRestant(paiement: any): number{
    if (!Array.isArray(paiement?.echeances) || paiement.echeances.length === 0) return Number(paiement?.montantTotal || 0);
    const paye = paiement.echeances.filter((e: any) => (e?.statutCss || '') === 'badge-payé').reduce((sum: number, e: any) => sum + Number(e?.montant || 0), 0);
    return Math.max(0, Number(paiement?.montantTotal || 0) - paye);
  }

  // Bandeau “À régler”
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
    const today = new Date(); const floorToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const d = new Date(e.dateAffichable);
    return Math.floor((d.getTime() - floorToday.getTime()) / 86400000);
  }
  dueState(e:any): 'late'|'soon'|'upcoming'{
    const n = this.daysUntil(e); if (n < 0) return 'late'; if (n <= 7) return 'soon'; return 'upcoming';
  }
  dueTitle(e:any): string{ const s = this.dueState(e); if (s === 'late') return 'En retard'; if (s === 'soon') return 'À régler'; return 'Prochaine échéance'; }
  daysLabel(n:number): string{ if (n < 0) return `${Math.abs(n)} j de retard`; if (n === 0) return `— aujourd'hui`; if (n === 1) return `— demain`; return `— dans ${n} jours`; }

  // Wizard
  nextStep(): void{
    if (this.step < this.maxStep) {
      this.step++;
      if (this.step === 3) {
        this.montantTotalAPayer = this.getMontantParEcheance();
        setTimeout(() => this.initStripeElement(), 200);
      }
    }
  }
  previousStep(): void{ if (this.step > 1) this.step--; }
  selectMembre(membre: { id: number; nom: string; prenom: string }): void{
    this.enfantSelectionne = membre.id;
    this.enfantSelectionneNom = `${membre.prenom} ${membre.nom}`;
  }

  // Stripe (écran principal)
  initStripeElement(): void{
    const container = document.querySelector('#card-element'); if (!container) return;
    this.stripeService.getStripeInstance().then((stripe: any) => {
      this.stripe = stripe; const elements = stripe.elements();
      if (this.cardElement) { try { this.cardElement.unmount(); } catch {} }
      this.cardElement = elements.create('card'); this.cardElement.mount('#card-element');
    });
  }

  // Création Paiement
  initierPaiement(): void{
    if (this.enCoursDePaiement || this.confirming) return;
    if (!this.enfantSelectionne || !this.cardElement) return;

    this.enCoursDePaiement = true; this.confirming = true;
    this.paiementErreur = false; this.erreurMessage = ''; this.lastPaymentIntentId = null;

    const utilisateurId = Number(localStorage.getItem('utilisateurId')) || undefined;
    const dtoCreation = {
      membreId: this.enfantSelectionne,
      type: this.typeChoisi,
      modePaiement: this.modePaiement,
      montantTotal: this.montantInitial,
      nombreEcheances: this.typeChoisi === 'ECHELONNE' ? this.nombreEcheances : 1,
      utilisateurId
    };
    this.log('initierPaiement.create.payload', dtoCreation);

    this.http.post<any>(`${this.API}/paiements/parent/ajouter`, dtoCreation, { headers: this.authHeaders() })
      .subscribe({
        next: (creationRes) => {
          this.log('initierPaiement.create.res', creationRes);
          const paiementId = creationRes?.id ?? creationRes?.paiementId;
          if (!paiementId) { this.failPaiement('ID de paiement introuvable après création'); this.confirming = false; return; }
          this.paiementIdEnCours = Number(paiementId);

          let echeanceIdToPay: number | undefined = undefined;
          if (Array.isArray(creationRes?.echeances)) {
            const firstUnpaid = (creationRes.echeances as any[])
              .sort((a, b) => (a?.numero ?? 0) - (b?.numero ?? 0))
              .find(e => !this.isPaid(e?.statut));
            echeanceIdToPay = firstUnpaid?.id;
          }

          const piPayload: any = { paiementId: this.paiementIdEnCours };
          if (echeanceIdToPay) piPayload.echeanceId = echeanceIdToPay;

          this.http.post<any>(`${this.API}/stripe/create-payment-intent`, piPayload, { headers: this.authHeaders() })
            .subscribe({
              next: async (resPI) => {
                const clientSecret = resPI?.clientSecret;
                this.lastPaymentIntentId = resPI?.paymentIntentId ?? this.extractPiIdFromClientSecret(clientSecret);
                if (!clientSecret) { this.failPaiement('Client secret Stripe manquant'); this.confirming = false; return; }

                try {
                  const result = await this.stripe.confirmCardPayment(clientSecret, { payment_method: { card: this.cardElement } });
                  if (result?.error) { this.failPaiement(result.error.message || 'Erreur de paiement'); this.confirming = false; return; }

                  await this.syncPaymentIntentOnce();
                  this.paiementReussi = true; this.enCoursDePaiement = false; this.confirming = false; this.step = 4;
                  this.loadPaiements();
                } catch (e) { this.failPaiement('Exception lors de la confirmation Stripe', e); this.confirming = false; }
              },
              error: (errPI) => { this.failPaiement('Erreur création PaymentIntent Stripe', errPI); this.confirming = false; }
            });
        },
        error: (err) => { this.failPaiement('Erreur création du paiement en BDD', err); this.confirming = false; }
      });
  }

  private failPaiement(msg: string, err?: any){
    console.error('❌', msg, err || ''); this.erreurMessage = msg; this.paiementErreur = true; this.enCoursDePaiement = false;
  }

  // Paiement d’échéance (parent)
  ouvrirModalPaiement(paiement: any, echeance: any): void{
    if (!paiement || !echeance) return;
    if ((echeance?.statutCss || '') === 'badge-payé') return;

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
    });
  }
  payerEcheances(): void{
    if (this.enCoursDePaiement || this.confirming) return;
    if (!this.paiementActuel || !this.cardElementParentModal || !this.echeanceEnCours) return;

    this.enCoursDePaiement = true; this.confirming = true;
    this.paiementErreur = false; this.erreurMessage = ''; this.lastPaymentIntentId = null;

    const paiementId = Number(this.paiementActuel?.id || this.paiementActuel?.paiementId);
    const echeanceId = Number(this.echeanceEnCours?.id);

    const payload = { paiementId, echeanceId };

    this.http.post<any>(`${this.API}/stripe/create-payment-intent`, payload, { headers: this.authHeaders() })
      .subscribe({
        next: async (resPI) => {
          const clientSecret = resPI?.clientSecret;
          this.lastPaymentIntentId = resPI?.paymentIntentId ?? this.extractPiIdFromClientSecret(clientSecret);
          if (!clientSecret) { this.failPaiement('Client secret Stripe manquant'); this.confirming = false; return; }

          try {
            const result = await this.stripe.confirmCardPayment(clientSecret, { payment_method: { card: this.cardElementParentModal } });
            this.enCoursDePaiement = false;
            if (result?.error) { this.paiementErreur = true; this.erreurMessage = result.error.message || 'Erreur de paiement'; this.confirming = false; return; }

            await this.syncPaymentIntentOnce();
            this.paiementReussi = true; this.fermerModalPaiement(); this.loadPaiements(); this.confirming = false;
          } catch (e) { this.failPaiement('Exception lors de la confirmation Stripe', e); this.confirming = false; }
        },
        error: (err) => { this.failPaiement('Erreur création PaymentIntent Stripe', err); this.confirming = false; }
      });
  }

  // Aides
  getMontantParEcheance(): number{
    return this.typeChoisi === 'ECHELONNE' && this.nombreEcheances > 0
      ? this.montantInitial / this.nombreEcheances : this.montantInitial;
  }
  getMontantAPayerMaintenant(): number{ return this.typeChoisi === 'ECHELONNE' ? this.getMontantParEcheance() : this.montantInitial; }
  labelEcheances(n:number){ return n===1 ? '1 échéance' : `${n} échéances`; }
}
