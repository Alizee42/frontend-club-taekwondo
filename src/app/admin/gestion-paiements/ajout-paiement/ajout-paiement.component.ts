import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-ajout-paiement',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './ajout-paiement.component.html',
  styleUrls: ['./ajout-paiement.component.css']
})
export class AjoutPaiementComponent implements OnInit {
  paiement: any = {
    utilisateurNom: '',
    utilisateurPrenom: '',
    utilisateurEmail: '',
    type: 'Cotisation',
    montantTotal: 0,
    modePaiement: 'espèces',
    datePaiement: '',
    echeances: [],
    justificatif: null
  };

  nomFichier: string | null = null;

  sections = {
    utilisateur: true,
    details: true,
    echeances: true,
    justificatif: true
  };

  constructor(private http: HttpClient) {}

  ngOnInit(): void {}

  toggleSection(section: keyof typeof this.sections): void {
    this.sections[section] = !this.sections[section];
  }

  onModePaiementChange(): void {
    if (this.paiement.modePaiement !== 'échéances') {
      this.paiement.echeances = [];
    }
  }

  ajouterEcheance(): void {
    this.paiement.echeances.push({
      dateEcheance: '',
      montant: 0,
      statut: 'en attente'
    });
  }

  supprimerEcheance(index: number): void {
    this.paiement.echeances.splice(index, 1);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.paiement.justificatif = input.files[0];
      this.nomFichier = input.files[0].name;
    }
  }

  validerPaiement(): void {
    if (!this.paiement.utilisateurNom || !this.paiement.utilisateurPrenom || !this.paiement.type || !this.paiement.datePaiement) {
      alert("Merci de remplir tous les champs obligatoires.");
      return;
    }

    if (this.paiement.modePaiement === 'échéances') {
      const somme = this.paiement.echeances.reduce((s: number, e: any) => s + Number(e.montant), 0);
      if (somme !== Number(this.paiement.montantTotal)) {
        alert("La somme des échéances ne correspond pas au montant total.");
        return;
      }
    }

    const formData = new FormData();
    formData.append('utilisateurNom', this.paiement.utilisateurNom);
    formData.append('utilisateurPrenom', this.paiement.utilisateurPrenom);
    formData.append('utilisateurEmail', this.paiement.utilisateurEmail || '');
    formData.append('type', this.paiement.type);
    formData.append('montantTotal', String(this.paiement.montantTotal));
    formData.append('modePaiement', this.paiement.modePaiement);
    formData.append('datePaiement', this.paiement.datePaiement);

    if (this.paiement.modePaiement === 'échéances') {
      formData.append('echeances', JSON.stringify(this.paiement.echeances));
    }

    if (this.paiement.justificatif) {
      formData.append('justificatif', this.paiement.justificatif);
    }

    this.http.post('/api/paiements/ajouter-complet', formData).subscribe({
      next: () => {
        alert("Paiement enregistré avec succès !");
        this.resetFormulaire();
      },
      error: err => {
        console.error(err);
        alert("Erreur lors de l'enregistrement du paiement.");
      }
    });
  }

  resetFormulaire(): void {
    this.paiement = {
      utilisateurNom: '',
      utilisateurPrenom: '',
      utilisateurEmail: '',
      type: 'Cotisation',
      montantTotal: 0,
      modePaiement: 'espèces',
      datePaiement: '',
      echeances: [],
      justificatif: null
    };
    this.nomFichier = null;
  }
}
