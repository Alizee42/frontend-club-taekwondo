import { Component, OnInit, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { StripeService } from '../../services/stripe.service';
import { ParametresPaiementService } from '../../services/parametres-paiement.service';

type TypePaiement = 'UNIQUE' | 'ECHELONNE';

@Component({
  selector: 'app-paiement',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './paiement.component.html',
  styleUrls: ['./paiement.component.css']
})
export class PaiementComponent implements OnInit, AfterViewInit {
  private readonly API = '/api';

  // Wizard -> 3 étapes : 1 Mode, 2 Paiement, 3 Confirmation
  step = 1;
  maxStep = 3;

  // Membre courant
  membreId: number | null = null;
  membreNom = 'Vous';
  userEmail: string | null = null;

  // Historique
  paiements: any[] = [];
  paiementsUniques: any[] = [];
  paiementsEcheances: any[] = [];

  // Paramètres
  montantInitial = 0;
  typeChoisi: TypePaiement = 'UNIQUE';
  nombreEcheances = 1;
  echeancesOptions: number[] = []; // seulement quand ECHELONNE
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

  // Anti double-confirm
  private confirming = false;

  // Modales
  modalOuverte = false; // échéance (historique)
  paiementActuel: any = null;
  echeanceEnCours: any = null;
  montantTotalAPayer = 0;

  modalCarteOuverte = false; // checkout principal
  stripeReady = false;
  private stripeElementMounted = false;

  // Affichage “payées”
  private showPaidByPlanId: Record<number, boolean> = {};

  // Confirmation
  factureUrl: string | null = null;
  paymentDate: Date | null = null;
  montantPaye = 0;
  today = new Date();

  constructor(
    private http: HttpClient,
    private stripeService: StripeService,
    private parametresService: ParametresPaiementService
  ) {}

  // ===== Utils =====
  private authHeaders() {
    const token = localStorage.getItem('token') || '';
    return { Authorization: `Bearer ${token}` };
  }
  private log(where: string, payload?: any) { console.log(`[Membre][${where}]`, payload ?? ''); }
  private isPaid(s: any) { return /pay[eé]e?/i.test(String(s ?? '')); }
  private extractPiIdFromClientSecret(clientSecret?: string | null): string | null {
    if (!clientSecret) return null;
    const i = clientSecret.indexOf('_secret_'); return i > 0 ? clientSecret.substring(0, i) : null;
  }
  private buildFactureUrl(paiementId: number){ return `${this.API}/paiements/${paiementId}/facture`; }
  telechargerFacture(){ if (this.factureUrl) window.open(this.factureUrl, '_blank', 'noopener'); }
  private myUserId(): number { return Number(localStorage.getItem('utilisateurId') || 0); }

  /** mapping + normalisation pour l’historique */
  private mapPaiementFromApi(p: any) {
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
  }

  /** appartient bien à l’utilisateur courant (membreId ou utilisateurId) */
  private isMine(p: any): boolean {
    const mid = Number(p?.membreId ?? p?.membre?.id ?? p?.beneficiaireId ?? p?.enfantId ?? NaN);
    const uid = Number(p?.utilisateurId ?? p?.userId ?? p?.utilisateur?.id ?? NaN);
    const meMidOk = this.membreId ? mid === this.membreId : false;
    const meUidOk = uid && uid === this.myUserId();
    return !!(meMidOk || meUidOk);
  }

  /** si l’API n’a pas encore le paiement créé, on l’ajoute localement */
  private ensureInHistory(created: any) {
    if (!created) return;
    const id = Number(created?.id ?? created?.paiementId);
    if (!id) return;
    const already = this.paiements.some(x => Number(x?.id ?? x?.paiementId) === id);
    if (already) return;

    const mapped = this.mapPaiementFromApi({
      ...created,
      membreId: this.membreId ?? created?.membreId ?? created?.membre?.id,
      utilisateurId: this.myUserId()
    });
    if (this.isMine(mapped)) {
      this.paiements = [mapped, ...this.paiements];
      this.mettreAJourFiltresPaiements();
      this.log('history.optimistic.add', mapped);
    }
  }

  private async syncPaymentIntentOnce(): Promise<void> {
    if (!this.lastPaymentIntentId) return;
    try {
      this.log('sync-payment.req', this.lastPaymentIntentId);
      await firstValueFrom(this.http.post(
        `${this.API}/stripe/sync-payment`,
        { paymentIntentId: this.lastPaymentIntentId },
        { headers: this.authHeaders() }
      ));
      this.log('sync-payment.ok');
    } catch (e) { this.log('sync-payment.err', e); }
    finally { this.lastPaymentIntentId = null; }
  }

  // ===== Cycle =====
  ngOnInit(): void {
    // Récupère montants/échelonnage
    this.parametresService.parametres$.subscribe((p) => {
      this.log('parametres$', p);
      if (p) {
        this.montantInitial = Number(p.montantCotisation || 0);
        const maxEch = Math.max(1, Number(p.echeancesAutorisees || 1));
        const full = Array.from({ length: maxEch }, (_, i) => i + 1);
        // Retire 1 : on ne propose que 2+
        this.echeancesOptions = full.filter(n => n > 1);
        if (!this.echeancesOptions.length) this.echeancesOptions = [2,3,4];
      }
      this.loadMembre();
    });
  }

  ngAfterViewInit(): void {
    // Stripe se monte dans les modales
  }

  // ===== Chargements =====
  loadMembre(): void {
    this.http.get<any>(`${this.API}/membres/me`, { headers: this.authHeaders() })
      .subscribe({
        next: (me) => {
          this.membreId = Number(me?.id ?? me?.membreId ?? me?.userId ?? 0) || null;
          const prenom = me?.prenom || me?.firstName || (localStorage.getItem('userPrenom') || '');
          const nom = me?.nom || me?.lastName || (localStorage.getItem('userNom') || '');
          this.userEmail = me?.email || me?.utilisateur?.email || localStorage.getItem('userEmail') || null;
          this.membreNom = (prenom || 'Vous') + (nom ? ` ${nom}` : '');
          this.log('me', { id: this.membreId, nom: this.membreNom, email: this.userEmail });
          this.loadPaiements();
        },
        error: _ => {
          // Fallback local
          const localId = Number(localStorage.getItem('membreId') || localStorage.getItem('utilisateurId') || 0);
          if (localId) this.membreId = localId;
          const localNom = localStorage.getItem('userNom') || '';
          const localPrenom = localStorage.getItem('userPrenom') || '';
          this.userEmail = localStorage.getItem('userEmail') || null;
          this.membreNom = (localPrenom || 'Vous') + (localNom ? ` ${localNom}` : '');
          this.log('me.fallback.localStorage', { id: this.membreId, nom: this.membreNom, email: this.userEmail });
          this.loadPaiements();
        }
      });
  }

  loadPaiements(): void {
    const headers = this.authHeaders();

    // 1) Route membre dédiée (si dispo)
    this.http.get<any[]>(`${this.API}/paiements/membre/mes-paiements`, { headers }).subscribe({
      next: (data1) => {
        this.log('paiements.route#1.ok', data1);
        const mapped1 = (data1 || []).map(p => this.mapPaiementFromApi(p));
        this.paiements = mapped1.filter(p => this.isMine(p));
        this.mettreAJourFiltresPaiements();
      },
      error: _ => {
        // 2) Route filtrée par membreId si supportée
        if (this.membreId) {
          this.http.get<any[]>(`${this.API}/paiements?membreId=${this.membreId}`, { headers }).subscribe({
            next: (data2) => {
              this.log('paiements.route#2.ok', data2);
              const mapped2 = (data2 || []).map(p => this.mapPaiementFromApi(p));
              this.paiements = mapped2.filter(p => this.isMine(p));
              this.mettreAJourFiltresPaiements();
            },
            error: _ => {
              // 3) Fallback : GET /paiements puis filtre client
              this.http.get<any[]>(`${this.API}/paiements`, { headers }).subscribe({
                next: (data3) => {
                  this.log('paiements.route#3.ok', data3);
                  const mapped3 = (data3 || []).map(p => this.mapPaiementFromApi(p));
                  this.paiements = mapped3.filter(p => this.isMine(p));
                  this.mettreAJourFiltresPaiements();
                },
                error: (err3) => console.error('❌ [Paiements] Erreur (tous):', err3)
              });
            }
          });
        } else {
          // pas de membreId -> on tente directement la 3
          this.http.get<any[]>(`${this.API}/paiements`, { headers }).subscribe({
            next: (data3) => {
              this.log('paiements.route#3.ok', data3);
              const mapped3 = (data3 || []).map(p => this.mapPaiementFromApi(p));
              this.paiements = mapped3.filter(p => this.isMine(p));
              this.mettreAJourFiltresPaiements();
            },
            error: (err3) => console.error('❌ [Paiements] Erreur (tous):', err3)
          });
        }
      }
    });
  }

  private normalizeStatut(raw: any) {
    const s = String(raw ?? '')
      .normalize('NFD').replace(/\p{Diacritic}/gu, '')
      .toLowerCase().trim();
    if (['paye','payé','payee','payée'].includes(s)) return { statutDisplay: 'payé', statutCss: 'badge-payé' };
    if (['annule','annulé'].includes(s)) return { statutDisplay: 'annulé', statutCss: 'badge-annulé' };
    return { statutDisplay: 'en attente', statutCss: 'badge-en-attente' };
  }

  mettreAJourFiltresPaiements(): void {
    this.paiementsUniques   = this.paiements.filter(p => p.type === 'UNIQUE');
    this.paiementsEcheances = this.paiements.filter(p => p.type === 'ECHELONNE');
  }

  // ===== Sélecteurs / helpers =====
  unpaidEcheances(p:any){ return (p?.echeances || []).filter((e:any)=> (e?.statutCss||'')!=='badge-payé'); }
  paidEcheances(p:any){ return (p?.echeances || []).filter((e:any)=> (e?.statutCss||'')==='badge-payé'); }
  toggleShowPaid(id:number){ this.showPaidByPlanId[id]=!this.showPaidByPlanId[id]; }
  isShowPaid(id:number){ return !!this.showPaidByPlanId[id]; }
  paidCount(p:any){ return this.paidEcheances(p).length; }
  progressPercent(p:any){ const t=(p?.echeances||[]).length||0; if(!t)return 0; return Math.round((this.paidCount(p)/t)*100); }
  calculerMontantRestant(p:any): number{
    if (!Array.isArray(p?.echeances) || !p.echeances.length) return Number(p?.montantTotal||0);
    const paye = p.echeances
      .filter((e:any)=>(e?.statutCss||'')==='badge-payé')
      .reduce((s:number,e:any)=>s+Number(e?.montant||0),0);
    return Math.max(0, Number(p?.montantTotal||0)-paye);
  }

  // ===== Wizard =====
  nextStep(): void{
    if (this.step < this.maxStep) {
      this.step++;
      if (this.step === 2) {
        this.log('step->2(recap)', { type: this.typeChoisi, nEch: this.nombreEcheances });
      }
    }
  }
  previousStep(): void{ if (this.step > 1) this.step--; }

  // Mode
  setMode(mode: TypePaiement){
    this.typeChoisi = mode;
    if (mode === 'ECHELONNE') {
      if (!this.nombreEcheances || this.nombreEcheances < 2) {
        this.nombreEcheances = (this.echeancesOptions[0] ?? 2);
      }
    } else {
      this.nombreEcheances = 1;
    }
    this.log('setMode', { typeChoisi: this.typeChoisi, nombreEcheances: this.nombreEcheances });
  }
  onEcheancesFocusOrChange(){ if (this.typeChoisi !== 'ECHELONNE') this.setMode('ECHELONNE'); }

  // ===== Modale carte principale =====
  ouvrirModalCarte(): void {
    this.log('ouvrirModalCarte');
    this.modalCarteOuverte = true;
    setTimeout(() => this.mountStripeOn('card-element-main-modal'), 0);
  }
  fermerModalCarte(): void {
    this.log('fermerModalCarte');
    this.modalCarteOuverte = false;
  }
  validerCarte(): void {
    this.log('validerCarte.click');
    this.enCoursDePaiement = true;
    this.initierPaiement(true);
  }

  private async mountStripeOn(targetId: string): Promise<void> {
    if (this.stripeElementMounted) { this.stripeReady = true; return; }
    const container = document.getElementById(targetId);
    if (!container) { this.log('mountStripeOn.noContainer', targetId); return; }
    try {
      const stripe = await this.stripeService.getStripeInstance();
      if (!stripe) { this.log('mountStripeOn.noStripe'); this.stripeReady = false; return; }
      this.stripe = stripe;
      const elements = this.stripe.elements();
      if (this.cardElement) { try { this.cardElement.unmount(); } catch {} }
      this.cardElement = elements.create('card');
      this.cardElement.mount(`#${targetId}`);
      this.stripeElementMounted = true;
      this.stripeReady = true;
      this.log('mountStripeOn.ok', targetId);
    } catch (e) { this.log('mountStripeOn.err', e); this.stripeReady = false; }
  }

  // ===== Création + paiement =====
  initierPaiement(fromModal = false): void{
    if ((this.enCoursDePaiement && !fromModal && this.confirming) || !this.membreId) { this.log('initierPaiement.abort'); return; }
    if (!this.cardElement) {
      this.paiementErreur = true;
      this.erreurMessage = 'Veuillez saisir votre carte dans la fenêtre sécurisée.';
      this.log('initierPaiement.abort.noCard');
      return;
    }

    this.enCoursDePaiement = true; this.confirming = true;
    this.paiementErreur = false; this.erreurMessage = ''; this.lastPaymentIntentId = null;

    const utilisateurId = Number(localStorage.getItem('utilisateurId')) || undefined;
    const dtoCreation = {
      membreId: this.membreId,
      type: this.typeChoisi,
      modePaiement: this.modePaiement,
      montantTotal: this.montantInitial,
      nombreEcheances: this.typeChoisi === 'ECHELONNE' ? this.nombreEcheances : 1,
      utilisateurId
    };
    this.log('create.paiement.req', dtoCreation);

    // ✅ Endpoint membre côté back
    this.http.post<any>(`${this.API}/paiements/ajouter-membre`, dtoCreation, { headers: this.authHeaders() })
      .subscribe({
        next: (creationRes) => {
          this.log('create.paiement.res', creationRes);
          const paiementId = creationRes?.id ?? creationRes?.paiementId;
          if (!paiementId) { this.failPaiement('ID de paiement introuvable après création'); this.confirming = false; return; }
          this.paiementIdEnCours = Number(paiementId);

          // snapshot pour affichage optimiste
          const createdSnapshot = {
            ...creationRes,
            id: this.paiementIdEnCours,
            paiementId: this.paiementIdEnCours,
            membreId: this.membreId,
            type: this.typeChoisi,
            modePaiement: this.modePaiement,
            montantTotal: this.montantInitial
          };

          this.factureUrl = creationRes?.factureUrl || this.buildFactureUrl(this.paiementIdEnCours);
          this.montantPaye = this.getMontantAPayerMaintenant();

          let echeanceIdToPay: number | undefined = undefined;
          if (Array.isArray(creationRes?.echeances)) {
            const firstUnpaid = (creationRes.echeances as any[])
              .sort((a, b) => (a?.numero ?? 0) - (b?.numero ?? 0))
              .find(e => !this.isPaid(e?.statut));
            echeanceIdToPay = firstUnpaid?.id;
          }

          const piPayload: any = { paiementId: this.paiementIdEnCours };
          if (echeanceIdToPay) piPayload.echeanceId = echeanceIdToPay;
          if (this.userEmail) piPayload.customerEmail = this.userEmail; // ✅ reçu Stripe
          this.log('createPI.req', piPayload);

          this.http.post<any>(`${this.API}/stripe/create-payment-intent`, piPayload, { headers: this.authHeaders() })
            .subscribe({
              next: async (resPI) => {
                this.log('createPI.res', resPI);
                const clientSecret = resPI?.clientSecret;
                this.lastPaymentIntentId = resPI?.paymentIntentId ?? this.extractPiIdFromClientSecret(clientSecret);
                if (!clientSecret) { this.failPaiement('Client secret Stripe manquant'); this.confirming = false; return; }

                try {
                  if (!this.stripe) { this.failPaiement('Stripe non initialisé'); this.confirming = false; return; }
                  const result = await this.stripe.confirmCardPayment(clientSecret, { payment_method: { card: this.cardElement } });
                  if (result?.error) { this.failPaiement(result.error.message || 'Erreur de paiement'); this.confirming = false; return; }

                  await this.syncPaymentIntentOnce();
                  this.paymentDate = new Date();

                  if (fromModal) this.modalCarteOuverte = false;
                  this.paiementReussi = true; this.enCoursDePaiement = false; this.confirming = false;
                  this.step = 3; // ✅ confirmation (3ème étape)

                  this.loadPaiements();
                  this.ensureInHistory(createdSnapshot); // filet optimiste
                  this.log('paiement.succes', { paiementId: this.paiementIdEnCours, factureUrl: this.factureUrl });
                } catch (e) { this.failPaiement('Exception lors de la confirmation Stripe'); this.log('confirm.err', e); this.confirming = false; }
              },
              error: (errPI) => { this.failPaiement('Erreur création PaymentIntent Stripe'); this.log('createPI.err', errPI); this.confirming = false; }
            });
        },
        error: (err) => { this.failPaiement('Erreur création du paiement en BDD'); this.log('create.paiement.err', err); this.confirming = false; }
      });
  }

  private failPaiement(msg: string){
    this.erreurMessage = msg;
    this.paiementErreur = true;
    this.enCoursDePaiement = false;
    this.log('paiement.fail', msg);
  }

  // ===== Paiement d’échéance (historique) =====
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
      this.log('stripe.element.parentModal.mounted');
    });
  }
  
  payerEcheances(): void{
    if (this.enCoursDePaiement || this.confirming) return;
    if (!this.paiementActuel || !this.cardElementParentModal || !this.echeanceEnCours) return;

    this.enCoursDePaiement = true; this.confirming = true;
    this.paiementErreur = false; this.erreurMessage = ''; this.lastPaymentIntentId = null;

    const paiementId = Number(this.paiementActuel?.id || this.paiementActuel?.paiementId);
    const echeanceId = Number(this.echeanceEnCours?.id);
    const payload: any = { paiementId, echeanceId };
    if (this.userEmail) payload.customerEmail = this.userEmail; // ✅ reçu Stripe
    this.log('echeance.createPI.req', payload);

    this.http.post<any>(`${this.API}/stripe/create-payment-intent`, payload, { headers: this.authHeaders() })
      .subscribe({
        next: async (resPI) => {
          this.log('echeance.createPI.res', resPI);
          const clientSecret = resPI?.clientSecret;
          this.lastPaymentIntentId = resPI?.paymentIntentId ?? this.extractPiIdFromClientSecret(clientSecret);
          if (!clientSecret) { this.failPaiement('Client secret Stripe manquant'); this.confirming = false; return; }

          try {
            if (!this.stripe) { this.failPaiement('Stripe non initialisé'); this.confirming = false; return; }
            const result = await this.stripe.confirmCardPayment(clientSecret, { payment_method: { card: this.cardElementParentModal } });
            this.enCoursDePaiement = false;
            if (result?.error) { this.paiementErreur = true; this.erreurMessage = result.error.message || 'Erreur de paiement'; this.confirming = false; return; }

            await this.syncPaymentIntentOnce();
            this.paiementReussi = true; this.fermerModalPaiement(); this.loadPaiements(); this.confirming = false;
          } catch (e) { this.failPaiement('Exception lors de la confirmation Stripe'); this.log('echeance.confirm.err', e); this.confirming = false; }
        },
        error: (err) => { this.failPaiement('Erreur création PaymentIntent Stripe'); this.log('echeance.createPI.err', err); this.confirming = false; }
      });
  }

  /** Ouvre le reçu Stripe natif (paiement ou échéance) via le back */
  ouvrirRecuStripe(paiementId?: number, echeanceId?: number): void {
    const pid = paiementId ?? this.paiementIdEnCours;
    if (!pid) { this.log('receipt.abort.noPid'); return; }
    let url = `${this.API}/stripe/receipt/${pid}`;
    if (echeanceId) url += `?echeanceId=${echeanceId}`;
    window.open(url, '_blank', 'noopener');
  }

  // ===== Aides montant =====
  getMontantParEcheance(): number{
    return this.typeChoisi === 'ECHELONNE' && this.nombreEcheances > 0
      ? this.montantInitial / this.nombreEcheances : this.montantInitial;
  }
  getMontantAPayerMaintenant(): number{
    return this.typeChoisi === 'ECHELONNE' ? this.getMontantParEcheance() : this.montantInitial;
  }
  labelEcheances(n:number){ return n===1 ? '1 échéance' : `${n} échéances`; }
}
