import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  PaymentAdminService,
  AjoutPaiementPayload
} from '../../../services/payment-admin.service';
import { debounce } from './utils/debounce';

type TypeProfil = 'ADULTE' | 'PARENT';
type TypePaiement = 'unique' | 'echeances';
type ModePaiement = 'especes' | 'virement' | 'stripe';

interface EcheanceInput {
  dateEcheance: string; // yyyy-MM-dd
  montant: number;
  statut?: 'en attente' | 'payé';
  numero?: number;
}

@Component({
  selector: 'app-ajout-paiement',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ajout-paiement.component.html',
  styleUrls: ['./ajout-paiement.component.css']
})
export class AjoutPaiementComponent implements OnInit {
  @Output() saved = new EventEmitter<void>();
  @Output() changementVue = new EventEmitter<string>();

  // Stepper
  currentStep = 0;
  steps = [
    { label: '👤 Profil' },
    { label: '💳 Détails' },
    { label: '📆 Échéances' },
    { label: '📁 Récap & Justificatif' }
  ];

  // Profil
  typeProfil: TypeProfil = 'ADULTE';
  creationManuelle = false;
  nouvelUtilisateur = { prenom: '', nom: '', email: '', role: 'ADULTE' as TypeProfil };

  // 👉 Enfants créés à la volée si rôle = PARENT
  enfantsNouveaux: { prenom: string; nom: string }[] = [];
  addEnfant() { this.enfantsNouveaux.push({ prenom: '', nom: '' }); }
  removeEnfant(i: number) { this.enfantsNouveaux.splice(i, 1); }
  formatEnfantsNouveaux(): string {
    return (this.enfantsNouveaux || [])
      .map(e => `${(e?.prenom || '').trim()} ${(e?.nom || '').trim()}`.trim())
      .filter(Boolean)
      .join(', ');
  }

  // Recherches & sélections
  qAdulte = '';
  qParent = '';
  adultes: any[] = [];
  parents: any[] = [];
  enfantsDuParent: any[] = [];

  selectedAdulteId?: number;
  selectedParentId?: number;
  selectedMembreIds: number[] = [];

  // Paiement
  typePaiement: TypePaiement = 'unique';
  modePaiement: ModePaiement = 'especes';
  montantTotal = 0;
  datePaiement = this.today();

  // Échéances
  nombreEcheances = 2;
  premiereDate = this.today();
  intervalDays = 30;
  echeances: EcheanceInput[] = [];

  // Justificatif
  justificatifFile?: File;
  nomFichier = '';

  // (facultatif)
  commentaire = '';

  // UI
  loading = false;
  errorMsg = '';
  successMsg = '';

  constructor(private api: PaymentAdminService) {}

  ngOnInit(): void {
    this.rechercheAdultes('');
    this.rechercheParents('');
  }

  // --- Helpers ---
  today(): string {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }

  onFileSelected(ev: Event) {
    const input = ev.target as HTMLInputElement | null;
    const f = input?.files?.[0];
    if (f) {
      this.justificatifFile = f;
      this.nomFichier = f.name;
    }
  }

  // Recherches avec debounce
  rechercheAdultes = debounce((q: string) => {
    this.api.getAdultes(q).subscribe((res) => (this.adultes = res || []));
  }, 250);

  rechercheParents = debounce((q: string) => {
    this.api.getParents(q).subscribe((res) => (this.parents = res || []));
  }, 250);

  onSearchAdulte(q: string) {
    this.qAdulte = q;
    this.rechercheAdultes(q);
  }

  onSearchParent(q: string) {
    this.qParent = q;
    this.rechercheParents(q);
  }

  onChangeParent() {
    this.selectedMembreIds = [];
    if (this.selectedParentId) {
      this.api.getMembresByParent(this.selectedParentId).subscribe(res => {
        this.enfantsDuParent = res || [];
      });
    } else {
      this.enfantsDuParent = [];
    }
  }

  // Échéances
  genererEcheances() {
    if (this.typePaiement !== 'echeances') {
      this.echeances = [];
      return;
    }
    if (!this.montantTotal || !this.nombreEcheances || !this.premiereDate) return;

    const n = Math.max(1, Math.min(12, Number(this.nombreEcheances) || 1));
    const base = Math.floor((Number(this.montantTotal) / n) * 100) / 100;

    const res: EcheanceInput[] = [];
    let totalRep = 0;

    const start = new Date(this.premiereDate);
    const step = Math.max(7, Number(this.intervalDays) || 30);

    for (let i = 0; i < n; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i * step);
      const montant = base;
      totalRep += montant;
      res.push({
        dateEcheance: d.toISOString().slice(0, 10),
        montant,
        statut: 'en attente',
        numero: i + 1
      });
    }
    const diff = Math.round((Number(this.montantTotal) - totalRep) * 100) / 100;
    if (Math.abs(diff) > 0 && res.length) {
      res[res.length - 1].montant = +(res[res.length - 1].montant + diff).toFixed(2);
    }
    this.echeances = res;
  }

  // Navigation
  next() {
    if (!this.canGoNext(this.currentStep)) return;
    this.currentStep = Math.min(this.currentStep + 1, this.steps.length - 1);
  }
  prev() {
    this.currentStep = Math.max(this.currentStep - 1, 0);
  }
  isLastStep() { return this.currentStep === this.steps.length - 1; }

  canGoNext(step: number): boolean {
    this.errorMsg = '';
    if (step === 0) {
      if (this.creationManuelle) {
        if (!this.nouvelUtilisateur.prenom?.trim()) { this.errorMsg = 'Prénom requis'; return false; }
        if (!this.nouvelUtilisateur.nom?.trim()) { this.errorMsg = 'Nom requis'; return false; }
      } else {
        if (this.typeProfil === 'ADULTE' && !this.selectedAdulteId) { this.errorMsg = 'Sélectionne un adulte.'; return false; }
        if (this.typeProfil === 'PARENT' && !this.selectedParentId) { this.errorMsg = 'Sélectionne un parent.'; return false; }
      }
    }
    if (step === 1) {
      if (this.montantTotal <= 0) { this.errorMsg = 'Montant invalide.'; return false; }
      if (this.typePaiement === 'echeances' && !this.echeances.length) { this.errorMsg = 'Génère les échéances.'; return false; }
    }
    if (step === 2 && this.typePaiement === 'echeances') {
      const sum = this.echeances.reduce((s, e) => s + (e.montant || 0), 0);
      if (Math.abs(sum - Number(this.montantTotal)) > 0.01) { this.errorMsg = 'Somme des échéances ≠ montant total.'; return false; }
    }
    return true;
  }

  // Gestion checkbox enfants
  toggleMembre(ev: Event, id: number) {
    const checked = (ev.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.selectedMembreIds.includes(id)) {
        this.selectedMembreIds = [...this.selectedMembreIds, id];
      }
    } else {
      this.selectedMembreIds = this.selectedMembreIds.filter(x => x !== id);
    }
  }

  // Payload générique (utile si tu veux basculer sur /ajouter-complet JSON)
  buildPayload(): AjoutPaiementPayload {
    const base: AjoutPaiementPayload = {
      modePaiement: this.modePaiement.toUpperCase() as any, // ESPECES | VIREMENT | STRIPE
      typePaiement: (this.typePaiement === 'unique' ? 'UNIQUE' : 'ECHEANCES') as any,
      montantTotal: +this.montantTotal,
      datePaiement: this.datePaiement,
      commentaire: this.commentaire?.trim() || undefined
    };

    if (this.creationManuelle) {
      base.nouvelUtilisateur = {
        prenom: this.nouvelUtilisateur.prenom.trim(),
        nom: this.nouvelUtilisateur.nom.trim(),
        email: this.nouvelUtilisateur.email?.trim() || undefined,
        role: this.nouvelUtilisateur.role
      };
      if (this.nouvelUtilisateur.role === 'PARENT' && this.selectedMembreIds?.length) {
        base.membreIds = this.selectedMembreIds;
      }
    } else {
      base.typeProfil = this.typeProfil;
      if (this.typeProfil === 'ADULTE') {
        base.utilisateurId = this.selectedAdulteId!;
      } else {
        base.parentId = this.selectedParentId!;
        if (this.selectedMembreIds?.length) base.membreIds = this.selectedMembreIds;
      }
    }

    if (this.typePaiement === 'echeances') {
      base.echeances = this.echeances.map(e => ({
        dateEcheance: e.dateEcheance,
        montant: +e.montant,
        statut: e.statut || 'en attente',
        numero: e.numero
      }));
    }
    return base;
  }

  // Soumission
  validerPaiement() {
    this.loading = true;
    this.errorMsg = '';
    this.successMsg = '';

    // Helpers back (pour l’endpoint FormData)
    const typeBack: 'unique' | 'échelonné' =
      this.typePaiement === 'echeances' ? 'échelonné' : 'unique';

    const echeancesBack = this.typePaiement === 'echeances'
      ? this.echeances.map(e => ({
          dateEcheance: e.dateEcheance,
          montant: +e.montant,
          statut: e.statut || 'en attente',
          numero: e.numero
        }))
      : undefined;

    // ========= CAS 1 : Création manuelle -> FormData (/ajouter-complet) =========
    if (this.creationManuelle) {
      const nom = (this.nouvelUtilisateur.nom || '').trim();
      const prenom = (this.nouvelUtilisateur.prenom || '').trim();
      if (!nom || !prenom) {
        this.loading = false;
        this.errorMsg = 'Nom et prénom sont requis pour la création.';
        return;
      }

      this.api.ajouterPaiementCompletFormData({
        utilisateurNom: nom,
        utilisateurPrenom: prenom,
        utilisateurEmail: (this.nouvelUtilisateur.email || '').trim() || undefined,
        type: typeBack,                          // 'unique' | 'échelonné'
        montantTotal: this.montantTotal,
        modePaiement: this.modePaiement,         // 'especes' | 'virement' | 'stripe'
        datePaiement: this.datePaiement,         // yyyy-MM-dd
        echeances: echeancesBack,
        justificatif: this.justificatifFile || null
      }).subscribe({
        next: () => {
          this.loading = false;
          this.successMsg = 'Paiement ajouté avec succès.';
          this.saved.emit();
          this.changementVue.emit('paiements');
        },
        error: (err: any) => {
          this.loading = false;
          this.errorMsg = err?.error?.message || 'Erreur lors de la création du paiement.';
        }
      });

      return; // on sort ici
    }

    // ========= CAS 2 : Utilisateur existant -> JSON (/ajouter-manuel) =========
    const payload: AjoutPaiementPayload = {
      modePaiement: this.modePaiement.toUpperCase() as any, // ESPECES|VIREMENT|STRIPE (le service mappe STRIPE->CB si besoin)
      typePaiement: (this.typePaiement === 'echeances' ? 'ECHEANCES' : 'UNIQUE') as any,
      montantTotal: +this.montantTotal,
      datePaiement: this.datePaiement,
      commentaire: this.commentaire?.trim() || undefined
    };

    if (this.typeProfil === 'ADULTE') {
      payload.typeProfil = 'ADULTE';
      payload.utilisateurId = this.selectedAdulteId!;
    } else {
      payload.typeProfil = 'PARENT';
      payload.parentId = this.selectedParentId!;
      if (this.selectedMembreIds?.length) payload.membreIds = this.selectedMembreIds;
    }

    if (this.typePaiement === 'echeances') {
      payload.echeances = this.echeances.map(e => ({
        dateEcheance: e.dateEcheance,
        montant: +e.montant,
        statut: e.statut || 'en attente',
        numero: e.numero
      }));
    }

    this.api.ajouterPaiementManuel(payload).subscribe({
      next: () => {
        this.loading = false;
        this.successMsg = 'Paiement ajouté avec succès.';
        this.saved.emit();
        this.changementVue.emit('paiements');
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMsg = err?.error?.message || 'Erreur lors de l’ajout du paiement.';
      }
    });
  }
}
