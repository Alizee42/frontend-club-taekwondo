import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentAdminService } from '../../../services/payment-admin.service';
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

  // Enfants à créer à la volée si rôle = PARENT (facultatif)
  enfantsNouveaux: Array<{ prenom: string; nom: string }> = [];

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
    // charge des listes de base au démarrage
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

  // Gestion enfants nouveaux (création à la volée)
  addEnfant() {
    this.enfantsNouveaux.push({ prenom: '', nom: '' });
  }
  removeEnfant(i: number) {
    this.enfantsNouveaux.splice(i, 1);
  }
  formatEnfantsNouveaux(): string {
    if (!this.enfantsNouveaux?.length) return '';
    return this.enfantsNouveaux
      .map(e => `${(e.prenom || '').trim()} ${(e.nom || '').trim()}`.trim())
      .filter(s => !!s)
      .join(', ');
  }

  // Échéances
  genererEcheances() {
    if (this.typePaiement !== 'echeances') {
      this.echeances = [];
      return;
    }
    if (!this.montantTotal || !this.nombreEcheances || !this.premiereDate) return;

    const montantBase = Math.floor((this.montantTotal / this.nombreEcheances) * 100) / 100;
    const res: EcheanceInput[] = [];
    let totalRep = 0;

    const start = new Date(this.premiereDate);
    for (let i = 0; i < this.nombreEcheances; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i * this.intervalDays);
      const montant = montantBase;
      totalRep += montant;
      res.push({
        dateEcheance: d.toISOString().slice(0, 10),
        montant,
        statut: 'en attente',
        numero: i + 1
      });
    }
    const diff = Math.round((this.montantTotal - totalRep) * 100) / 100;
    if (diff !== 0 && res.length) res[res.length - 1].montant = +(res[res.length - 1].montant + diff).toFixed(2);
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
      if (Math.abs(sum - this.montantTotal) > 0.01) { this.errorMsg = 'Somme des échéances ≠ montant total.'; return false; }
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

  // Soumission
  validerPaiement() {
    this.loading = true;
    this.errorMsg = '';

    // Sécurise le cas UNIQUE : aucune échéance envoyée
    if (this.typePaiement === 'unique') {
      this.echeances = [];
      // Option UX si tu veux un paiement immédiat par défaut :
      // this.modePaiement = 'stripe';
    }

    // ✅ Mapping attendu par le backend
    const typeBack: 'UNIQUE' | 'ECHELONNE' =
      this.typePaiement === 'echeances' ? 'ECHELONNE' : 'UNIQUE';

    const echeancesBack = this.typePaiement === 'echeances'
      ? this.echeances.map(e => ({
          dateEcheance: e.dateEcheance,
          montant: +e.montant,
          statut: e.statut || 'en attente',
          numero: e.numero
        }))
      : undefined;

    // ========= CAS 1 : Création manuelle -> JSON (/ajouter-complet)
    if (this.creationManuelle) {
      const nom = (this.nouvelUtilisateur.nom || '').trim();
      const prenom = (this.nouvelUtilisateur.prenom || '').trim();
      if (!nom || !prenom) {
        this.loading = false;
        this.errorMsg = 'Nom et prénom sont requis pour la création.';
        return;
      }

      this.api.ajouterPaiementCompletJSON({
        utilisateurNom: nom,
        utilisateurPrenom: prenom,
        utilisateurEmail: (this.nouvelUtilisateur.email || '').trim() || undefined,
        // On envoie les deux clés (le back accepte l’une ou l’autre)
        type: typeBack,                // 'UNIQUE' | 'ECHELONNE'
        typePaiement: typeBack,        // 'UNIQUE' | 'ECHELONNE'
        montantTotal: this.montantTotal,
        modePaiement: this.modePaiement,     // 'especes' | 'virement' | 'stripe'
        datePaiement: this.datePaiement,     // yyyy-MM-dd
        echeances: echeancesBack
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

      return;
    }

    // ========= CAS 2 : Utilisateur existant -> JSON (/ajouter-manuel)
    const dto: any = {
      type: typeBack,                 // 'UNIQUE' | 'ECHELONNE'
      typePaiement: typeBack,         // 'UNIQUE' | 'ECHELONNE'
      montantTotal: +this.montantTotal,
      modePaiement: this.modePaiement,
      datePaiement: this.datePaiement,
      echeances: echeancesBack,       // uniquement si échelonné
      commentaire: this.commentaire?.trim() || undefined
    };

    if (this.typeProfil === 'ADULTE') {
      dto.utilisateurId = this.selectedAdulteId;
    } else {
      dto.parentId = this.selectedParentId;
      if (this.selectedMembreIds?.length) {
        dto.membreIds = this.selectedMembreIds;
      }
    }

    this.api.ajouterPaiementManuel(dto).subscribe({
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
