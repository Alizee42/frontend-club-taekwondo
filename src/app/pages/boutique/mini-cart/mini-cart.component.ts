import {
  Component, Input, Output, EventEmitter, OnInit, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { PanierService, Produit } from '../../../services/panier.service';
import { CommandeService } from '../../../services/commande.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { environment } from '../../../../environments/environment';

type Mode = 'ESPECES' | 'CHEQUE' | 'VIREMENT' | 'CB';

interface ClubInfo { id: number; name: string; adresse?: string; rib?: string; }

@Component({
  standalone: true,
  selector: 'app-mini-cart',
  templateUrl: './mini-cart.component.html',
  styleUrls: ['./mini-cart.component.css'],
  imports: [CommonModule, FormsModule],
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
    private toast: ToastService,
    private router: Router,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.sub.add(this.panier.panier$.subscribe(items => (this.items = items)));
    this.sub.add(this.panier.total$.subscribe(t => (this.total = t)));
    this.chargerClub();
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); }

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

    this.loading = true;
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

  fermerSucces(): void {
    this.success = false;
    this.commandeId = null;
    this.closed.emit();
  }

  close(): void { this.closed.emit(); }
}
