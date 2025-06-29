import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ParametresPaiementService } from '../../../services/parametres-paiement.service';
import { ParametresPaiement } from '../../../models/parametres-paiement';

@Component({
  selector: 'app-ajout-paiement',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './ajout-paiement.component.html',
  styleUrls: ['./ajout-paiement.component.css']
})
export class AjoutPaiementComponent implements OnInit {
  @Output() changementVue = new EventEmitter<string>();

  currentStep = 0;

  steps = [
    { label: '👤 Utilisateur' },
    { label: '💳 Détails' },
    { label: '📆 Échéances' },
    { label: '📁 Justificatif' }
  ];

  paiement: any = {
    utilisateurNom: '',
    utilisateurPrenom: '',
    utilisateurEmail: '',
    type: 'Cotisation',
    montantTotal: 0,
    modePaiement: '',
    datePaiement: '',
    echeances: [],
    justificatif: null
  };

  nomFichier: string | null = null;
  nombreEcheances = 1;
  parametresGlobaux: ParametresPaiement | null = null;
  modesDisponibles: string[] = [];

  constructor(
    private http: HttpClient,
    private parametresService: ParametresPaiementService
  ) {}

  ngOnInit(): void {
    this.parametresService.parametres$.subscribe({
      next: (parametres: ParametresPaiement | null) => {
        if (parametres) {
          this.parametresGlobaux = parametres;
  
          // ✅ Compatible avec structure plate
          this.modesDisponibles = ['virement', 'especes', 'stripe'].filter(mode => (parametres as any)[mode]);
  
          this.paiement.modePaiement = parametres.modePaiementParDefaut;
          this.nombreEcheances = parametres.echeancesAutorisees || 1;
  
          if (this.paiement.type === 'Cotisation') {
            this.paiement.montantTotal = parametres.montantCotisation;
          }
        }
      },
      error: () => {
        console.error("❌ Échec du chargement des paramètres globaux");
      }
    });
  }
  

  nextStep(): void {
    if (!this.isLastStep()) this.currentStep++;
  }

  prevStep(): void {
    if (this.currentStep > 0) this.currentStep--;
  }

  isLastStep(): boolean {
    return this.paiement.modePaiement === 'échéances'
      ? this.currentStep === 3
      : this.currentStep === 2;
  }

  onModePaiementChange(): void {
    if (this.paiement.modePaiement === 'échéances') {
      this.nombreEcheances = this.parametresGlobaux?.echeancesAutorisees || 1;
      this.genererEcheances();
    } else {
      this.paiement.echeances = [];
    }
  }

  genererEcheances(): void {
    const montant = Number(this.paiement.montantTotal);
    const nombre = Number(this.nombreEcheances);
    if (!montant || !nombre || nombre <= 0) return;

    const montantParEcheance = +(montant / nombre).toFixed(2);
    this.paiement.echeances = [];

    for (let i = 0; i < nombre; i++) {
      this.paiement.echeances.push({
        dateEcheance: '',
        montant: montantParEcheance,
        statut: 'en attente',
        numero: i + 1
      });
    }
  }

  supprimerEcheance(index: number): void {
    this.paiement.echeances.splice(index, 1);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.paiement.justificatif = input.files[0];
      this.nomFichier = input.files[0].name;
    }
  }

  validerPaiement(): void {
    const p = this.paiement;

    if (!p.utilisateurNom || !p.utilisateurPrenom || !p.type || !p.datePaiement || p.montantTotal <= 0) {
      alert("Merci de remplir tous les champs obligatoires avec des valeurs valides.");
      return;
    }

    if (p.modePaiement === 'échéances') {
      if (p.echeances.length === 0) {
        alert("Veuillez ajouter au moins une échéance.");
        return;
      }
      const somme = p.echeances.reduce((s: number, e: any) => s + Number(e.montant), 0);
      if (Math.abs(somme - p.montantTotal) > 0.01) {
        alert("La somme des échéances ne correspond pas au montant total.");
        return;
      }
    }

    const montantPaye = p.modePaiement === 'échéances'
      ? p.echeances.filter((e: any) => e.statut === 'payé').reduce((s: number, e: any) => s + Number(e.montant), 0)
      : p.montantTotal;

    const montantRestant = p.montantTotal - montantPaye;

    const formData = new FormData();
    formData.append('utilisateurNom', p.utilisateurNom);
    formData.append('utilisateurPrenom', p.utilisateurPrenom);
    formData.append('utilisateurEmail', p.utilisateurEmail || '');
    formData.append('type', p.type);
    formData.append('montantTotal', String(p.montantTotal));
    formData.append('montantPaye', String(montantPaye));
    formData.append('montantRestant', String(montantRestant));
    formData.append('modePaiement', p.modePaiement);
    formData.append('datePaiement', p.datePaiement);
    formData.append('statut', p.modePaiement === 'échéances' ? 'en attente' : 'payé');

    if (p.modePaiement === 'échéances') {
      formData.append('echeances', JSON.stringify(
        p.echeances.map((e: any, i: number) => ({
          dateEcheance: e.dateEcheance,
          montant: e.montant,
          statut: e.statut,
          numero: i + 1
        }))
      ));
    }

    if (p.justificatif) {
      formData.append('justificatif', p.justificatif);
    }

    this.http.post('/api/paiements/ajouter-complet', formData).subscribe({
      next: () => {
        alert("✅ Paiement enregistré avec succès !");
        this.resetFormulaire();
        this.changementVue.emit("paiements");
      },
      error: err => {
        console.error(err);
        alert("❌ Erreur lors de l'enregistrement du paiement.");
      }
    });
  }

  resetFormulaire(): void {
    this.paiement = {
      utilisateurNom: '',
      utilisateurPrenom: '',
      utilisateurEmail: '',
      type: 'Cotisation',
      montantTotal: this.parametresGlobaux?.montantCotisation || 0,
      modePaiement: this.parametresGlobaux?.modePaiementParDefaut || 'espèces',
      datePaiement: '',
      echeances: [],
      justificatif: null
    };
    this.nomFichier = null;
    this.nombreEcheances = this.parametresGlobaux?.echeancesAutorisees || 1;
    this.currentStep = 0;
  }
}
