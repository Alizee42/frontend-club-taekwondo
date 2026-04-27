import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { PaymentAdminService } from '../../../services/payment-admin.service';
import { debounce } from './utils/debounce';
import { UiButtonComponent } from '../../../shared/ui/buttons/ui-button/ui-button.component';

type ModePaiement = 'especes' | 'virement' | 'stripe';
type TypePaiement = 'unique' | 'echeances';

interface EcheanceInput {
  dateEcheance: string;
  montant: number;
  statut?: 'en attente' | 'payé';
  numero?: number;
}

interface PersonResult {
  id: number;
  prenom: string;
  nom: string;
  email: string;
  type: 'ADULTE' | 'PARENT';
}

@Component({
  selector: 'app-ajout-paiement',
  standalone: true,
  imports: [CommonModule, FormsModule, UiButtonComponent],
  templateUrl: './ajout-paiement.component.html',
  styleUrls: ['./ajout-paiement.component.css']
})
export class AjoutPaiementComponent implements OnInit {
  @Output() saved = new EventEmitter<void>();
  @Output() changementVue = new EventEmitter<string>();
  @Output() paiementAjoute = new EventEmitter<void>();

  currentStep = 0;
  steps = [{ label: 'Payeur' }, { label: 'Paiement' }];

  // Recherche unifiée
  searchQuery = '';
  searchResults: PersonResult[] = [];
  selectedPerson: PersonResult | null = null;
  enfantsDuParent: any[] = [];
  selectedMembreIds: number[] = [];

  // Création manuelle (cas rare)
  creationManuelle = false;
  nouvelUtilisateur = { prenom: '', nom: '', email: '', role: 'ADULTE' as 'ADULTE' | 'PARENT' };
  enfantsNouveaux: Array<{ prenom: string; nom: string }> = [];

  // Paiement
  typePaiement: TypePaiement = 'unique';
  modePaiement: ModePaiement = 'especes';
  montantTotal = 0;
  datePaiement = this.today();

  // Échéances inline
  nombreEcheances = 2;
  premiereDate = this.today();
  intervalDays = 30;
  echeances: EcheanceInput[] = [];

  // Justificatif
  justificatifFile?: File;
  nomFichier = '';

  loading = false;
  errorMsg = '';
  successMsg = '';

  constructor(private api: PaymentAdminService) {}

  ngOnInit(): void {
    this.rechercherTout('');
  }

  today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  rechercherTout = debounce((q: string) => {
    forkJoin({
      adultes: this.api.getAdultes(q),
      parents: this.api.getParents(q)
    }).subscribe(({ adultes, parents }) => {
      this.searchResults = [
        ...(adultes || []).map(u => ({ ...u, type: 'ADULTE' as const })),
        ...(parents || []).map(u => ({ ...u, type: 'PARENT' as const }))
      ];
    });
  }, 250);

  onSearch(q: string) {
    this.searchQuery = q;
    this.rechercherTout(q);
  }

  selectPerson(person: PersonResult) {
    this.selectedPerson = person;
    this.enfantsDuParent = [];
    this.selectedMembreIds = [];
    if (person.type === 'PARENT') {
      this.api.getMembresByParent(person.id).subscribe(res => {
        this.enfantsDuParent = res || [];
        this.selectedMembreIds = (res || []).map((m: any) => m.id);
      });
    }
  }

  toggleMembre(ev: Event, id: number) {
    const checked = (ev.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.selectedMembreIds.includes(id)) this.selectedMembreIds = [...this.selectedMembreIds, id];
    } else {
      this.selectedMembreIds = this.selectedMembreIds.filter(x => x !== id);
    }
  }

  toggleCreationManuelle() {
    this.creationManuelle = !this.creationManuelle;
    if (this.creationManuelle) {
      this.selectedPerson = null;
    } else {
      this.nouvelUtilisateur = { prenom: '', nom: '', email: '', role: 'ADULTE' };
      this.enfantsNouveaux = [];
    }
  }

  addEnfant() { this.enfantsNouveaux.push({ prenom: '', nom: '' }); }
  removeEnfant(i: number) { this.enfantsNouveaux.splice(i, 1); }

  onTypePaiementChange() {
    if (this.typePaiement === 'echeances') this.genererEcheances();
    else this.echeances = [];
  }

  genererEcheances() {
    if (this.typePaiement !== 'echeances' || !this.montantTotal || !this.nombreEcheances || !this.premiereDate) return;
    const base = Math.floor((this.montantTotal / this.nombreEcheances) * 100) / 100;
    const res: EcheanceInput[] = [];
    let total = 0;
    const start = new Date(this.premiereDate);
    for (let i = 0; i < this.nombreEcheances; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i * this.intervalDays);
      total += base;
      res.push({ dateEcheance: d.toISOString().slice(0, 10), montant: base, statut: 'en attente', numero: i + 1 });
    }
    const diff = Math.round((this.montantTotal - total) * 100) / 100;
    if (diff !== 0 && res.length) res[res.length - 1].montant = +(res[res.length - 1].montant + diff).toFixed(2);
    this.echeances = res;
  }

  onFileSelected(ev: Event) {
    const f = (ev.target as HTMLInputElement)?.files?.[0];
    if (f) { this.justificatifFile = f; this.nomFichier = f.name; }
  }

  next() {
    if (!this.canGoNext(this.currentStep)) return;
    this.currentStep = Math.min(this.currentStep + 1, this.steps.length - 1);
  }
  prev() { this.currentStep = Math.max(this.currentStep - 1, 0); }
  isLastStep() { return this.currentStep === this.steps.length - 1; }

  canGoNext(step: number): boolean {
    this.errorMsg = '';
    if (step === 0) {
      if (this.creationManuelle) {
        if (!this.nouvelUtilisateur.prenom?.trim()) { this.errorMsg = 'Prénom requis'; return false; }
        if (!this.nouvelUtilisateur.nom?.trim()) { this.errorMsg = 'Nom requis'; return false; }
      } else {
        if (!this.selectedPerson) { this.errorMsg = 'Sélectionne un payeur.'; return false; }
      }
    }
    return true;
  }

  validerPaiement() {
    this.errorMsg = '';
    if (this.montantTotal <= 0) { this.errorMsg = 'Montant invalide.'; return; }
    if (this.typePaiement === 'echeances' && !this.echeances.length) { this.errorMsg = 'Génère les échéances.'; return; }

    this.loading = true;
    const typeBack: 'UNIQUE' | 'ECHELONNE' = this.typePaiement === 'echeances' ? 'ECHELONNE' : 'UNIQUE';
    const echeancesBack = this.typePaiement === 'echeances'
      ? this.echeances.map(e => ({ dateEcheance: e.dateEcheance, montant: +e.montant, statut: e.statut || 'en attente', numero: e.numero }))
      : undefined;

    if (this.creationManuelle) {
      this.api.ajouterPaiementCompletJSON({
        utilisateurNom: this.nouvelUtilisateur.nom.trim(),
        utilisateurPrenom: this.nouvelUtilisateur.prenom.trim(),
        utilisateurEmail: this.nouvelUtilisateur.email.trim() || undefined,
        type: typeBack, typePaiement: typeBack,
        montantTotal: this.montantTotal,
        modePaiement: this.modePaiement,
        datePaiement: this.datePaiement,
        echeances: echeancesBack
      }).subscribe({
        next: () => this.onSuccess(),
        error: (err: any) => this.onError(err)
      });
      return;
    }

    const dto: any = {
      type: typeBack, typePaiement: typeBack,
      montantTotal: +this.montantTotal,
      modePaiement: this.modePaiement,
      datePaiement: this.datePaiement,
      echeances: echeancesBack
    };

    if (this.selectedPerson!.type === 'ADULTE') {
      dto.utilisateurId = this.selectedPerson!.id;
    } else {
      dto.parentId = this.selectedPerson!.id;
      if (this.selectedMembreIds.length) dto.membreIds = this.selectedMembreIds;
    }

    this.api.ajouterPaiementManuel(dto).subscribe({
      next: () => this.onSuccess(),
      error: (err: any) => this.onError(err)
    });
  }

  private onSuccess() {
    this.loading = false;
    this.successMsg = 'Paiement ajouté avec succès.';
    this.saved.emit();
    this.paiementAjoute.emit();
    this.changementVue.emit('paiements');
  }

  private onError(err: any) {
    this.loading = false;
    this.errorMsg = err?.error?.message || "Erreur lors de l'ajout du paiement.";
  }
}
