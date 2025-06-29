import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-suivi-paiements',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './suivi-paiements.component.html',
  styleUrls: ['./suivi-paiements.component.css'],
  providers: [CurrencyPipe]
})
export class SuiviPaiementsComponent implements OnInit {
  @Output() changementVue = new EventEmitter<string>();

  paiements: any[] = [];
  paiementsFiltres: any[] = [];

  filter = {
    type: '',
    statut: '',
    utilisateur: ''
  };

  modalStatutVisible = false;
  modalOuverte = false;
  modalAnnulationVisible = false;
  modalEcheancesVisible = false;
  modalFiltresVisible = false; // Ajout de la propriété manquante

  paiementActuel: any = null;
  paiementEnAnnulation: any = null;
  nouveauStatut: string = 'payé';
  motifAnnulation: string = '';

  paiementManuel: any = {
    utilisateurNom: '',
    utilisateurPrenom: '',
    utilisateurEmail: '',
    type: 'Cotisation',
    montantTotal: 0,
    modePaiement: 'espèces',
    datePaiement: '',
    echeances: []
  };

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.chargerPaiements();
  }
// Ajout des méthodes manquantes
ouvrirModalFiltres(): void {
  this.modalFiltresVisible = true;
}

fermerModalFiltres(): void {
  this.modalFiltresVisible = false;
}

  redirigerVersAjoutPaiement(): void {
    this.changementVue.emit('ajouter-paiement');
  }

  chargerPaiements(): void {
    this.http.get<any[]>('/api/paiements').subscribe(data => {
      this.paiements = data;
      this.filtrerPaiements();
    });
  }

  filtrerPaiements(): void {
    this.paiementsFiltres = this.paiements.filter(p => {
      const typeOK = this.filter.type ? p.type === this.filter.type : true;
      const statutOK = this.filter.statut ? p.statut === this.filter.statut : true;
      const utilisateurOK = this.filter.utilisateur
        ? (p.utilisateurNom?.toLowerCase().includes(this.filter.utilisateur.toLowerCase()) ||
           p.utilisateurPrenom?.toLowerCase().includes(this.filter.utilisateur.toLowerCase()))
        : true;
      return typeOK && statutOK && utilisateurOK;
    });
  }

  calculPourcentage(paiement: any): number {
    if (!paiement || typeof paiement.montantTotal !== 'number' || paiement.montantTotal <= 0) return 0;

    let montantPaye = 0;

    if (paiement.modePaiement === 'échéances' && Array.isArray(paiement.echeances)) {
      montantPaye = paiement.echeances
        .filter((e: any) => e.statut === 'payé')
        .reduce((sum: number, e: any) => sum + e.montant, 0);
    } else {
      const restant = typeof paiement.montantRestant === 'number' ? paiement.montantRestant : paiement.montantTotal;
      montantPaye = paiement.montantTotal - restant;
    }

    const pourcentage = (montantPaye / paiement.montantTotal) * 100;
    return Math.round(pourcentage);
  }

  ouvrirModalStatut(paiement: any): void {
    this.paiementActuel = paiement;
    this.nouveauStatut = paiement.statut;
    this.modalStatutVisible = true;
  }

  fermerModalStatut(): void {
    this.modalStatutVisible = false;
    this.paiementActuel = null;
  }

  confirmerChangementStatut(): void {
    if (!this.paiementActuel) return;

    const id = this.paiementActuel.id;
    let endpoint = '';

    if (this.nouveauStatut === 'payé') endpoint = 'valider';
    else if (this.nouveauStatut === 'annulé') {
      this.ouvrirModalAnnulation(this.paiementActuel);
      this.modalStatutVisible = false;
      return;
    } else {
      this.paiementActuel.statut = this.nouveauStatut;
      this.modalStatutVisible = false;
      this.filtrerPaiements();
      return;
    }

    this.http.post(`/api/paiements/${id}/${endpoint}`, {}).subscribe(() => {
      this.paiementActuel.statut = this.nouveauStatut;
      if (this.nouveauStatut === 'payé') {
        this.paiementActuel.montantRestant = 0;
      }
      this.modalStatutVisible = false;
      this.filtrerPaiements();
    });
  }

  ouvrirModalAnnulation(paiement: any): void {
    this.paiementEnAnnulation = paiement;
    this.motifAnnulation = '';
    this.modalAnnulationVisible = true;
  }

  fermerModalAnnulation(): void {
    this.modalAnnulationVisible = false;
    this.paiementEnAnnulation = null;
    this.motifAnnulation = '';
  }

  confirmerAnnulationPaiement(): void {
    if (!this.paiementEnAnnulation || !this.motifAnnulation.trim()) {
      alert("Veuillez indiquer un motif d’annulation.");
      return;
    }

    const dto = {
      motif: this.motifAnnulation,
      dateAnnulation: new Date().toISOString(),
      adminResponsable: 'admin'
    };

    this.http.put(`/api/paiements/${this.paiementEnAnnulation.id}/annuler`, dto).subscribe({
      next: () => {
        alert("✅ Paiement annulé.");
        this.modalAnnulationVisible = false;
        this.paiementEnAnnulation = null;
        this.chargerPaiements();
      },
      error: err => {
        console.error(err);
        alert("❌ Erreur lors de l’annulation.");
      }
    });
  }

  supprimerPaiement(paiement: any): void {
    const id = paiement.id;
    if (confirm(`Confirmer la suppression du paiement pour ${paiement.utilisateurNom} ${paiement.utilisateurPrenom} ?`)) {
      this.http.delete(`/api/paiements/${id}`).subscribe({
        next: () => {
          this.paiements = this.paiements.filter(p => p.id !== id);
          this.filtrerPaiements();
        },
        error: (err) => {
          alert("La suppression du paiement a échoué.");
        }
      });
    }
  }

  ouvrirModalEcheances(paiement: any): void {
    this.paiementActuel = paiement;
    this.modalEcheancesVisible = true;
  }

  fermerModalEcheances(): void {
    this.modalEcheancesVisible = false;
    this.paiementActuel = null;
  }

  ouvrirFormulairePaiement(): void {
    this.modalOuverte = true;
  }

  fermerFormulairePaiement(): void {
    this.modalOuverte = false;
    this.paiementManuel = {
      utilisateurNom: '',
      utilisateurPrenom: '',
      utilisateurEmail: '',
      type: 'Cotisation',
      montantTotal: 0,
      modePaiement: 'espèces',
      datePaiement: '',
      echeances: []
    };
  }

  onModePaiementChange(): void {
    if (this.paiementManuel.modePaiement === 'échéances') {
      if (this.paiementManuel.echeances.length === 0) {
        this.ajouterEcheance();
      }
    } else {
      this.paiementManuel.echeances = [];
    }
  }

  ajouterEcheance(): void {
    const montantRestant = this.paiementManuel.montantTotal || 0;
    this.paiementManuel.echeances.push({
      dateEcheance: '',
      montant: montantRestant,
      statut: 'en attente'
    });
  }

  supprimerEcheance(index: number): void {
    this.paiementManuel.echeances.splice(index, 1);
  }

  recalculerMontantRestant(): void {
    const montantPayé = this.paiementManuel.echeances.reduce((sum: number, e: any) =>
      e.statut === 'payé' ? sum + e.montant : sum, 0);
    this.paiementManuel.montantRestant = Math.max(0, this.paiementManuel.montantTotal - montantPayé);
  }

  enregistrerPaiementManuel(): void {
    const paiement = this.paiementManuel;

    if (!paiement.utilisateurNom || !paiement.utilisateurPrenom || !paiement.datePaiement) {
      alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    const dto: any = {
      utilisateurNom: paiement.utilisateurNom,
      utilisateurPrenom: paiement.utilisateurPrenom,
      utilisateurEmail: paiement.utilisateurEmail || null,
      type: paiement.type,
      montantTotal: paiement.montantTotal,
      modePaiement: paiement.modePaiement,
      datePaiement: paiement.datePaiement,
      statut: paiement.modePaiement === 'échéances' ? 'en attente' : 'payé',
      echeances: paiement.modePaiement === 'échéances' ? paiement.echeances : []
    };

    if (paiement.modePaiement === 'échéances') {
      const totalEcheances = dto.echeances.reduce((s: number, e: any) => s + (e.montant || 0), 0);
      if (totalEcheances !== dto.montantTotal) {
        alert("La somme des échéances doit être égale au montant total.");
        return;
      }
    }

    const endpoint = paiement.modePaiement === 'échéances'
      ? '/api/paiements/ajouter-complet'
      : '/api/paiements/ajouter-manuel';

    this.http.post(endpoint, dto).subscribe({
      next: () => {
        this.chargerPaiements();
        this.fermerFormulairePaiement();
        alert("Paiement enregistré avec succès !");
      },
      error: (err) => {
        alert("Erreur lors de l'ajout : " + (err.error?.message || err.message));
      }
    });
  }

  getMontantPaye(paiement: any): number {
    if (!paiement) return 0;

    if (paiement.modePaiement === 'échéances' && Array.isArray(paiement.echeances)) {
      return paiement.echeances
        .filter((e: any) => e.statut === 'payé')
        .reduce((sum: number, e: any) => sum + (e.montant || 0), 0);
    }

    return typeof paiement.montantRestant === 'number'
      ? paiement.montantTotal - paiement.montantRestant
      : paiement.montantTotal;
  }
}
