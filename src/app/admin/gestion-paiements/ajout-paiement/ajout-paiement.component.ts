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
    } else if (this.paiement.echeances.length === 0) {
      this.ajouterEcheance();
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

  calculMontantRestant(): number {
    if (this.paiement.modePaiement === 'échéances') {
      const payé = this.paiement.echeances.reduce((sum: number, e: any) =>
        e.statut === 'payé' ? sum + Number(e.montant) : sum, 0);
      return Math.max(0, this.paiement.montantTotal - payé);
    }
    return 0;
  }

  validerPaiement(): void {
    const p = this.paiement;

    // 🧪 Vérifications basiques
    if (!p.utilisateurNom || !p.utilisateurPrenom || !p.type || !p.datePaiement || p.montantTotal <= 0) {
      alert("Merci de remplir tous les champs obligatoires avec des valeurs valides.");
      return;
    }

    // 💰 Si mode échéances, vérification des montants
    if (p.modePaiement === 'échéances') {
      if (p.echeances.length === 0) {
        alert("Veuillez ajouter au moins une échéance.");
        return;
      }
      const somme = p.echeances.reduce((s: number, e: any) => s + Number(e.montant), 0);
      if (somme !== Number(p.montantTotal)) {
        alert("La somme des échéances ne correspond pas au montant total.");
        return;
      }
    }

    // 📦 Création du FormData
    const formData = new FormData();
    formData.append('utilisateurNom', p.utilisateurNom);
    formData.append('utilisateurPrenom', p.utilisateurPrenom);
    formData.append('utilisateurEmail', p.utilisateurEmail || '');
    formData.append('type', p.type);
    formData.append('montantTotal', String(p.montantTotal));
    formData.append('modePaiement', p.modePaiement);
    formData.append('datePaiement', p.datePaiement);
    formData.append('statut', p.modePaiement === 'échéances' ? 'en attente' : 'payé');

    // 🔁 Ajouter les échéances si besoin
    if (p.modePaiement === 'échéances') {
      formData.append('echeances', JSON.stringify(
        p.echeances.map((e: any, i: number) => ({
          dateEcheance: e.dateEcheance,
          montant: e.montant,
          statut: 'en attente',
          numero: i + 1
        }))
      ));
    }

    // 📎 Ajouter le fichier justificatif
    if (p.justificatif) {
      formData.append('justificatif', p.justificatif);
    }

    // 📤 Envoi vers le backend
    this.http.post('/api/paiements/ajouter-complet', formData).subscribe({
      next: () => {
        alert("✅ Paiement enregistré avec succès !");
        this.resetFormulaire();
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
      montantTotal: 0,
      modePaiement: 'espèces',
      datePaiement: '',
      echeances: [],
      justificatif: null
    };
    this.nomFichier = null;
  }
}
