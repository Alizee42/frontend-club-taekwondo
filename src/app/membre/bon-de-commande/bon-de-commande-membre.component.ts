import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CampagneCommandeService, CampagneCommande, BonCommandeRequest } from '../../services/campagne-commande.service';
import { ProduitService, Produit } from '../../services/produit.service';
import { AuthService } from '../../services/auth.service';
import { StripeService } from '../../services/stripe.service';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';

interface LigneForm {
  produit: Produit;
  quantite: number;
  taille: string;
  couleur: string;
  flocageActif: boolean;
  flocage: string;
}

@Component({
  selector: 'app-bon-de-commande-membre',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, UiButtonComponent, EmptyStateComponent],
  templateUrl: './bon-de-commande-membre.component.html',
  styleUrls: ['./bon-de-commande-membre.component.css']
})
export class BonDeCommandeMembreComponent implements OnInit, OnDestroy {
  campagne: CampagneCommande | null = null;
  produits: Produit[] = [];
  lignes: LigneForm[] = [];
  modePaiement = 'ESPECES';

  isLoadingCampagne = true;
  isLoadingProduits = false;
  isSubmitting = false;
  errorMsg = '';
  stripeError = '';
  step: 'form' | 'success' = 'form';

  readonly modesDisponibles = [
    { value: 'ESPECES', label: 'Espèces au club' },
    { value: 'CHEQUE', label: 'Chèque' },
    { value: 'VIREMENT', label: 'Virement' },
    { value: 'CB', label: 'Carte bancaire (Stripe)' },
  ];

  constructor(
    private campagneService: CampagneCommandeService,
    private produitService: ProduitService,
    private authService: AuthService,
    private stripeService: StripeService,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.chargerCampagne();
  }

  ngOnDestroy(): void {
    this.stripeService.unmount();
  }

  chargerCampagne(): void {
    this.isLoadingCampagne = true;
    this.errorMsg = '';
    this.campagneService.getCampagneActive().subscribe({
      next: (campagne) => {
        this.campagne = campagne;
        this.isLoadingCampagne = false;
        if (campagne?.clubId) {
          this.chargerProduits(campagne.clubId);
        }
      },
      error: () => {
        this.campagne = null;
        this.isLoadingCampagne = false;
      }
    });
  }

  chargerProduits(clubId: number): void {
    this.isLoadingProduits = true;
    this.produitService.getProduitsByClub(clubId).subscribe({
      next: (produits) => {
        this.produits = produits || [];
        this.lignes = this.produits.map(p => ({
          produit: p,
          quantite: 0,
          taille: '',
          couleur: '',
          flocageActif: false,
          flocage: '',
        }));
        this.isLoadingProduits = false;
      },
      error: () => {
        this.isLoadingProduits = false;
      }
    });
  }

  onModeChange(): void {
    this.stripeError = '';
    if (this.modePaiement === 'CB') {
      setTimeout(() => {
        this.stripeService.monterElementDans('#stripe-card-element').catch(err => {
          this.stripeError = err?.message || 'Stripe non disponible';
        });
      }, 100);
    } else {
      this.stripeService.unmount();
    }
  }

  get lignesSelectionnees(): LigneForm[] {
    return this.lignes.filter(l => l.quantite > 0);
  }

  get total(): number {
    return this.lignesSelectionnees.reduce((sum, l) => {
      const unit = l.flocageActif ? l.produit.prix + 10 : l.produit.prix;
      return sum + unit * l.quantite;
    }, 0);
  }

  get hasSelection(): boolean {
    return this.lignesSelectionnees.length > 0;
  }

  decrementer(ligne: LigneForm): void {
    if (ligne.quantite > 0) ligne.quantite--;
  }

  incrementer(ligne: LigneForm): void {
    ligne.quantite++;
  }

  async soumettre(): Promise<void> {
    if (!this.hasSelection || this.isSubmitting) return;
    this.isSubmitting = true;
    this.errorMsg = '';
    this.stripeError = '';

    const req: BonCommandeRequest = {
      campagneId: this.campagne?.id,
      modePaiement: this.modePaiement,
      lignesCommande: this.lignesSelectionnees.map(l => ({
        produitId: l.produit.id,
        quantite: l.quantite,
        prixUnitaire: l.flocageActif ? l.produit.prix + 10 : l.produit.prix,
        taille: l.taille || null,
        couleur: l.couleur || null,
        flocage: l.flocageActif && l.flocage ? l.flocage : null,
      })),
    };

    if (this.modePaiement === 'CB') {
      await this.soumettreAvecStripe(req);
    } else {
      this.soumettreDirectement(req);
    }
  }

  private soumettreDirectement(req: BonCommandeRequest): void {
    this.campagneService.soumettreEvenementCommande(req).subscribe({
      next: () => {
        this.step = 'success';
        this.isSubmitting = false;
      },
      error: (err) => {
        this.errorMsg = err?.error?.error || 'Impossible de soumettre la commande. Veuillez réessayer.';
        this.isSubmitting = false;
      }
    });
  }

  private async soumettreAvecStripe(req: BonCommandeRequest): Promise<void> {
    try {
      await firstValueFrom(this.campagneService.soumettreEvenementCommande(req));

      const paiementBody = { montantTotal: this.total, modePaiement: 'CB' };
      const paiementRes = await firstValueFrom(
        this.http.post<any>(`${environment.apiUrl}/paiements/ajouter-membre`, paiementBody)
      );

      const user$ = this.authService.user$;
      const user = await firstValueFrom(user$);

      await this.stripeService.createPaymentIntent({
        paiementId: paiementRes.paiementId,
        customerEmail: user?.email,
      });

      const result = await this.stripeService.confirmerPaiement();

      if (result.success) {
        this.step = 'success';
      } else {
        this.stripeError = result.message || 'Paiement refusé. Vérifiez vos informations.';
      }
    } catch (err: any) {
      this.stripeError = err?.message || 'Erreur lors du paiement Stripe.';
    } finally {
      this.isSubmitting = false;
    }
  }

  recommencer(): void {
    this.step = 'form';
    this.lignes.forEach(l => {
      l.quantite = 0;
      l.taille = '';
      l.couleur = '';
      l.flocage = '';
      l.flocageActif = false;
    });
    this.modePaiement = 'ESPECES';
    this.stripeService.unmount();
  }

  formatDate(date: string): string {
    if (!date) return '';
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date));
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
  }
}
