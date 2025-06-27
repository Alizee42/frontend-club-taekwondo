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
  paiementActuel: any = null;
  nouveauStatut: string = 'payé';

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
    console.log('📥 Initialisation du composant suivi-paiements...');
    this.chargerPaiements();
  }

  redirigerVersAjoutPaiement(): void {
    console.log('➡️ Redirection vers ajout-paiement');
    this.changementVue.emit('ajouter-paiement');
  }

  chargerPaiements(): void {
    console.log('🔄 Chargement des paiements...');
    this.http.get<any[]>('/api/paiements').subscribe(data => {
      console.log('✅ Paiements reçus :', data);
      this.paiements = data;
      this.filtrerPaiements();
    });
  }

  filtrerPaiements(): void {
    console.log('🔍 Filtrage des paiements...');
    this.paiementsFiltres = this.paiements.filter(p => {
      const typeOK = this.filter.type ? p.type === this.filter.type : true;
      const statutOK = this.filter.statut ? p.statut === this.filter.statut : true;
      const utilisateurOK = this.filter.utilisateur
        ? (p.utilisateurNom?.toLowerCase().includes(this.filter.utilisateur.toLowerCase()) ||
           p.utilisateurPrenom?.toLowerCase().includes(this.filter.utilisateur.toLowerCase()))
        : true;
      return typeOK && statutOK && utilisateurOK;
    });
    console.log('📊 Paiements filtrés :', this.paiementsFiltres);
  }

  calculPourcentage(paiement: any): number {
    if (!paiement || typeof paiement.montantTotal !== 'number' || paiement.montantTotal <= 0) {
      console.warn('❗ Paiement invalide ou montantTotal manquant:', paiement);
      return 0;
    }

    let montantPaye = 0;

    if (paiement.modePaiement === 'échéances' && Array.isArray(paiement.echeances)) {
      montantPaye = paiement.echeances
        .filter((e: any) => e.statut === 'payé')
        .reduce((sum: number, e: any) => sum + e.montant, 0);
      console.log(`📆 Paiement #${paiement.id} en échéances - montant payé:`, montantPaye);
    } else {
      const restant = typeof paiement.montantRestant === 'number' ? paiement.montantRestant : paiement.montantTotal;
      montantPaye = paiement.montantTotal - restant;
      console.log(`💸 Paiement #${paiement.id} unique - montant payé:`, montantPaye);
    }

    const pourcentage = (montantPaye / paiement.montantTotal) * 100;
    console.log(`📈 Paiement #${paiement.id} - Pourcentage payé: ${Math.round(pourcentage)}%`);
    return Math.round(pourcentage);
  }

  ouvrirModalStatut(paiement: any): void {
    console.log('📝 Ouverture de la modale de statut pour :', paiement);
    this.paiementActuel = paiement;
    this.nouveauStatut = paiement.statut;
    this.modalStatutVisible = true;
  }

  fermerModalStatut(): void {
    console.log('❌ Fermeture de la modale de statut');
    this.modalStatutVisible = false;
    this.paiementActuel = null;
  }

  confirmerChangementStatut(): void {
    if (!this.paiementActuel) return;

    const id = this.paiementActuel.id;
    let endpoint = '';

    if (this.nouveauStatut === 'payé') endpoint = 'valider';
    else if (this.nouveauStatut === 'annulé') endpoint = 'annuler';
    else {
      this.paiementActuel.statut = this.nouveauStatut;
      this.modalStatutVisible = false;
      this.filtrerPaiements();
      return;
    }

    console.log(`🚀 Envoi du changement de statut vers /api/paiements/${id}/${endpoint}`);

    this.http.post(`/api/paiements/${id}/${endpoint}`, {}).subscribe(() => {
      this.paiementActuel.statut = this.nouveauStatut;
      if (this.nouveauStatut === 'payé') {
        this.paiementActuel.montantRestant = 0;
      }
      this.modalStatutVisible = false;
      this.filtrerPaiements();
      console.log('✅ Statut mis à jour avec succès.');
    });
  }

  supprimerPaiement(paiement: any): void {
    const id = paiement.id;
    if (confirm(`Confirmer la suppression du paiement pour ${paiement.utilisateurNom} ${paiement.utilisateurPrenom} ?`)) {
      console.log('🗑 Suppression du paiement ID', id);
      this.http.delete(`/api/paiements/${id}`).subscribe({
        next: () => {
          this.paiements = this.paiements.filter(p => p.id !== id);
          this.filtrerPaiements();
          console.log('✅ Paiement supprimé');
        },
        error: (err) => {
          console.error('❌ Erreur lors de la suppression :', err);
          alert("La suppression du paiement a échoué. Veuillez réessayer.");
        }
      });
    }
  }

  ouvrirModalEcheances(paiement: any): void {
    console.log('🔍 Consultation des échéances pour :', paiement);
    alert(`Échéances pour ${paiement.utilisateurNom} ${paiement.utilisateurPrenom} :\n` +
      paiement.echeances.map((e: any) => `Date: ${e.dateEcheance}, Montant: ${e.montant}, Statut: ${e.statut}`).join('\n'));
  }

  ouvrirFormulairePaiement(): void {
    console.log('🧾 Ouverture du formulaire de paiement manuel');
    this.modalOuverte = true;
  }

  fermerFormulairePaiement(): void {
    console.log('❌ Fermeture du formulaire de paiement');
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
    console.log('🔁 Changement de mode de paiement:', this.paiementManuel.modePaiement);
    if (this.paiementManuel.modePaiement === 'échéances') {
      if (this.paiementManuel.echeances.length === 0) {
        this.ajouterEcheance();
      }
    } else {
      this.paiementManuel.echeances = [];
    }
  }

  ajouterEcheance(): void {
    console.log('➕ Ajout d’une échéance');
    const montantRestant = this.paiementManuel.montantTotal || 0;
    this.paiementManuel.echeances.push({
      dateEcheance: '',
      montant: montantRestant,
      statut: 'en attente'
    });
  }

  supprimerEcheance(index: number): void {
    console.log(`➖ Suppression de l’échéance #${index}`);
    this.paiementManuel.echeances.splice(index, 1);
  }

  recalculerMontantRestant(): void {
    const montantPayé = this.paiementManuel.echeances.reduce((sum: number, e: any) =>
      e.statut === 'payé' ? sum + e.montant : sum, 0);
    this.paiementManuel.montantRestant = Math.max(0, this.paiementManuel.montantTotal - montantPayé);
    console.log('🔄 Recalcul du montant restant :', this.paiementManuel.montantRestant);
  }

  enregistrerPaiementManuel(): void {
    console.log('💾 Enregistrement d’un paiement manuel');
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

    console.log('📤 Envoi des données vers :', endpoint, dto);

    this.http.post(endpoint, dto).subscribe({
      next: () => {
        console.log('✅ Paiement manuel enregistré');
        this.chargerPaiements();
        this.fermerFormulairePaiement();
        alert("Paiement enregistré avec succès !");
      },
      error: (err) => {
        console.error('❌ Erreur lors de l’ajout manuel :', err);
        alert("Erreur lors de l'ajout : " + (err.error?.message || err.message));
      }
    });
  }
}
