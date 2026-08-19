import {
  Component, Input, Output, EventEmitter, OnInit, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';

import { PanierService, Produit } from '../../../services/panier.service';
import { CommandeService } from '../../../services/commande.service';
import { AuthService } from '../../../services/auth.service';
import { StripeService } from '../../../services/stripe.service';
import { MembreService, Membre } from '../../../services/membre.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { UiModalComponent } from '../../../shared/ui/modal/ui-modal.component';
import { environment } from '../../../../environments/environment';

type Mode = 'ESPECES' | 'CHEQUE' | 'VIREMENT' | 'CB';

interface ClubInfo { id: number; name: string; adresse?: string; rib?: string; }

@Component({
  standalone: true,
  selector: 'app-mini-cart',
  templateUrl: './mini-cart.component.html',
  styleUrls: ['./mini-cart.component.css'],
  imports: [CommonModule, FormsModule, UiModalComponent],
})
export class MiniCartComponent implements OnInit, OnDestroy {
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();

  items: Produit[] = [];
  total = 0;
  modePaiement: Mode = 'ESPECES';
  loading = false;
  success = false;

  commandeId: number | null = null;
  modePaiementSucces: Mode = 'ESPECES';
  club: ClubInfo | null = null;
  stripeError = '';

  // Un PARENT doit préciser pour quel enfant il paie (le backend l'exige pour CB).
  isParent = false;
  enfants: Membre[] = [];
  enfantSelectionneId: number | null = null;
  modalPaiementOuverte = false;

  readonly modes: { value: Mode; label: string; icon: string }[] = [
    { value: 'ESPECES',  label: 'Espèces',       icon: 'ri-money-euro-circle-line' },
    { value: 'CHEQUE',   label: 'Chèque',         icon: 'ri-file-text-line' },
    { value: 'VIREMENT', label: 'Virement',        icon: 'ri-bank-line' },
    { value: 'CB',       label: 'Carte bancaire',  icon: 'ri-bank-card-line' },
  ];

  private sub = new Subscription();

  constructor(
    public panier: PanierService,
    private commandeService: CommandeService,
    private auth: AuthService,
    private stripeService: StripeService,
    private membreService: MembreService,
    private toast: ToastService,
    private router: Router,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.sub.add(this.panier.panier$.subscribe(items => (this.items = items)));
    this.sub.add(this.panier.total$.subscribe(t => (this.total = t)));
    this.chargerClub();
    this.chargerEnfantsSiParent();
  }

  private chargerEnfantsSiParent(): void {
    const role = (this.auth.getUtilisateurConnecte()?.['role'] || '').toString().toUpperCase();
    this.isParent = role === 'PARENT';
    if (!this.isParent) return;
    this.membreService.getMembresPourParentConnecte().subscribe({
      next: (enfants) => {
        this.enfants = enfants || [];
        if (this.enfants.length === 1) this.enfantSelectionneId = this.enfants[0].id;
      },
      error: () => { this.enfants = []; }
    });
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    this.stripeService.unmount();
  }

  /** Bouton principal du panier : ouvre la modale de paiement pour CB, sinon commande directement. */
  onValiderClick(): void {
    if (this.modePaiement === 'CB') {
      this.ouvrirModalPaiement();
    } else {
      this.commander();
    }
  }

  ouvrirModalPaiement(): void {
    this.stripeError = '';
    this.modalPaiementOuverte = true;
    setTimeout(() => {
      this.stripeService.monterElementDans('#mini-cart-stripe-card-element').catch(err => {
        this.stripeError = err?.message || 'Stripe non disponible';
      });
    }, 100);
  }

  fermerModalPaiement(): void {
    this.modalPaiementOuverte = false;
    this.stripeService.unmount();
  }

  private chargerClub(): void {
    const user = this.auth.getUtilisateurConnecte();
    const clubId = user?.['clubId'];
    if (!clubId) return;
    this.http.get<ClubInfo>(`${environment.apiUrl}/clubs/${clubId}`)
      .subscribe({ next: c => (this.club = c), error: () => {} });
  }

  get isEmpty(): boolean { return this.items.length === 0; }
  get isConnecte(): boolean { return this.auth.isConnecte(); }

  inc(item: Produit): void {
    this.panier.incrementer(item.id, { taille: item.taille, couleur: item.couleur, flocage: item.flocage, flocageActif: item.flocageActif });
  }
  dec(item: Produit): void {
    this.panier.decrementer(item.id, { taille: item.taille, couleur: item.couleur, flocage: item.flocage, flocageActif: item.flocageActif });
  }
  remove(item: Produit): void {
    this.panier.supprimer(item.id, { taille: item.taille, couleur: item.couleur, flocage: item.flocage, flocageActif: item.flocageActif });
  }

  goToConnexion(): void {
    this.closed.emit();
    this.router.navigate(['/connexion']);
  }

  commander(): void {
    if (!this.isConnecte) { this.goToConnexion(); return; }
    if (this.isEmpty) return;
    if (this.modePaiement === 'CB' && this.isParent && !this.enfantSelectionneId) {
      this.stripeError = 'Choisis pour quel enfant tu paies avant de continuer.';
      return;
    }

    this.loading = true;
    this.stripeError = '';
    this.modePaiementSucces = this.modePaiement;

    const lignes = this.items.map(item => ({
      produitId: item.id,
      produitNom: item.nom,
      quantite: item.quantite ?? 1,
      prixUnitaire: item.prix,
      sousTotal: item.prix * (item.quantite ?? 1),
      taille: item.taille ?? null,
      couleur: item.couleur ?? null,
      flocage: item.flocageActif ? (item.flocage ?? null) : null,
    }));

    if (this.modePaiement === 'CB') {
      this.commanderAvecStripe(lignes);
    } else {
      this.commandeService.passerCommandeDepuisPanier(this.modePaiement, lignes).subscribe({
        next: (commande: any) => {
          this.loading = false;
          this.commandeId = commande?.id ?? null;
          this.success = true;
          this.panier.viderPanier();
        },
        error: (err: any) => {
          this.loading = false;
          this.toast.error(err?.message ?? 'Impossible de passer la commande. Réessayez.');
        }
      });
    }
  }

  private async commanderAvecStripe(lignes: any[]): Promise<void> {
    try {
      const commande: any = await firstValueFrom(
        this.commandeService.passerCommandeDepuisPanier(this.modePaiement, lignes)
      );

      const paiementBody: any = { montantTotal: this.total, modePaiement: 'CB' };
      if (this.isParent && this.enfantSelectionneId) {
        paiementBody.membreId = this.enfantSelectionneId;
      }
      const paiementRes = await firstValueFrom(
        this.http.post<any>(`${environment.apiUrl}/paiements/ajouter-membre`, paiementBody)
      );

      const user = this.auth.getUtilisateurConnecte();

      await this.stripeService.createPaymentIntent({
        paiementId: paiementRes.paiementId,
        customerEmail: user?.email,
      });

      const result = await this.stripeService.confirmerPaiement();

      if (result.success) {
        this.commandeId = commande?.id ?? null;
        this.success = true;
        this.modalPaiementOuverte = false;
        this.panier.viderPanier();
      } else {
        this.stripeError = result.message || 'Paiement refusé. Vérifiez vos informations.';
      }
    } catch (err: any) {
      this.stripeError = err?.message || 'Erreur lors du paiement Stripe.';
    } finally {
      this.loading = false;
    }
  }

  fermerSucces(): void {
    this.success = false;
    this.commandeId = null;
    this.closed.emit();
  }

  close(): void { this.closed.emit(); }
}
