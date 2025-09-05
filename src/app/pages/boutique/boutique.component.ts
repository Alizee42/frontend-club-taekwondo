import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';   // *ngIf, *ngFor
import { FormsModule } from '@angular/forms';     // [(ngModel)]
import { PanierService } from '../../services/panier.service';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

interface Produit {
  id: number;
  nom: string;
  description: string;
  prixBase: number;
  prix: number;
  imageUrl: string;
  taille?: string;
  couleur?: string;
  flocageActif?: boolean;
  flocage?: string;
  quantite?: number;
  paiementId?: number;
}

type Selection = {
  taille: string | null;
  flocageActif: boolean;
  quantite: number;
};

type CreerCommandeResponse = {
  paiementId: number;
  [k: string]: any;
};

@Component({
  standalone: true,
  selector: 'app-boutique',
  templateUrl: './boutique.component.html',
  styleUrls: ['./boutique.component.css'],
  imports: [CommonModule, FormsModule],
})
export class BoutiqueComponent implements OnInit {
  produits: Produit[] = [];
  tailles: string[] = [];
  couleurs: string[] = ['Blanc'];
  confirmationMessage = '';

  selections: Record<number, Selection> = {};
  private readonly creerCommandeUrl = '/api/paiements/commande';

  constructor(
    private panierService: PanierService,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {

    this.tailles = Array.from(
      { length: (210 - 120) / 10 + 1 },
      (_, i) => `${120 + i * 10} cm`
    );
    

    this.produits = [
      {
        id: 1,
        nom: 'Dobok Taekwondo',
        description: 'Tenue blanche officielle',
        prixBase: 30,
        prix: 30,
        imageUrl: 'assets/images/dobok.jpg',
        taille: '',
        couleur: 'Blanc',
        flocageActif: false,
        flocage: '',
      },
    ];

    for (const p of this.produits) {
      this.selections[p.id] = { taille: null, flocageActif: false, quantite: 1 };
    }
  }

  private ensureSelection(productId: number): Selection {
    if (!this.selections[productId]) {
      this.selections[productId] = { taille: null, flocageActif: false, quantite: 1 };
    }
    return this.selections[productId];
  }

  getPrixUnitaire(p: Produit): number {
    const sel = this.ensureSelection(p.id);
    let total = p.prixBase;
    if (sel.flocageActif) total += 10;
    return total;
  }

  getPrixTotal(p: Produit): number {
    const sel = this.ensureSelection(p.id);
    return this.getPrixUnitaire(p) * Math.max(1, sel.quantite);
  }

  ajouterAuPanier(p: Produit): void {
    const sel = this.ensureSelection(p.id);
    if (!sel.taille) {
      alert('Veuillez sélectionner une taille.');
      console.warn('[Boutique] ajout refusé: taille manquante pour produit', p.id);
      return;
    }

    const quantite = Math.max(1, Number(sel.quantite || 1));
    const prixUnitaire = this.getPrixUnitaire(p);

    const item: Produit = {
      ...p,
      taille: sel.taille!,
      flocageActif: sel.flocageActif,
      quantite,
      prix: prixUnitaire,
    };

    this.panierService.ajouterAuPanier(item);
    this.panierService.openCart();

    this.confirmationMessage = 'Produit ajouté au panier !';
    setTimeout(() => (this.confirmationMessage = ''), 2000);
  }

  onChangeTaille(p: Produit, taille: string) {
    this.ensureSelection(p.id).taille = taille || null;
  }

  onToggleFloquage(p: Produit, checked: boolean) {
    this.ensureSelection(p.id).flocageActif = !!checked;
  }

  onChangeQuantite(p: Produit, val: string | number) {
    const q = Math.max(1, Number(val || 1));
    this.ensureSelection(p.id).quantite = q;
  }

  private buildCommandePayload() {
    const panier = this.panierService.getPanier();

    const lignes = panier.map((it) => {
      const quantite = Math.max(1, Number(it.quantite || 1));
      const prixUnitaire = it.prix;
      const totalLigne = Math.round(prixUnitaire * quantite * 100) / 100;

      return {
        produitId: it.id,
        nom: it.nom,
        quantite,
        prixUnitaire,
        taille: it.taille ?? null,
        couleur: it.couleur ?? null,
        flocageActif: !!it.flocageActif,
        flocage: it.flocage ?? null,
        totalLigne,
      };
    });

    const totalPanier = lignes.reduce((s: number, l: any) => s + l.totalLigne, 0);
    const payload = {
      source: 'BOUTIQUE',
      devise: 'EUR',
      lignes,
      total: totalPanier,
    };
    return payload;
  }

  private getAuthHeaders(): HttpHeaders {
    const token =
      localStorage.getItem('auth_token') ??
      localStorage.getItem('token') ??
      '';
    if (token) {
    } else {
      console.warn('[Boutique] Aucun token trouvé pour la création de commande');
    }
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  private async createCommandeOnServer(): Promise<number> {
    const payload = this.buildCommandePayload();
    try {
      const res = await this.http
        .post<CreerCommandeResponse>(this.creerCommandeUrl, payload, { headers: this.getAuthHeaders() })
        .toPromise();

      const paiementId = res?.paiementId;
      if (!paiementId || !Number.isFinite(paiementId)) {
        throw new Error("Réponse backend invalide : 'paiementId' manquant.");
      }

      // Stockage du paiementId dans localStorage pour un accès futur
      localStorage.setItem('paiementId', String(paiementId));

      return paiementId;
    } catch (e: any) {
      console.error('Erreur création commande:', e);
      alert(e?.message || 'Impossible de créer la commande.');
      throw e;
    }
  }

  async payerMaintenant(): Promise<void> {
    const panier = this.panierService.getPanier();

    if (!panier || panier.length === 0) {
      alert('Votre panier est vide.');
      console.warn('[Boutique] paiement annulé: panier vide');
      return;
    }

    try {
      const paiementId = await this.createCommandeOnServer();

      localStorage.setItem('paiementId', String(paiementId));

      await this.router.navigate([], {
        queryParams: { startPay: 1, paiementId },
        queryParamsHandling: 'merge',
      });

      this.panierService.openCart();
    } catch (e: any) {
      console.error('[Boutique] Erreur création commande:', e);
      alert(e?.message || 'Impossible de créer la commande.');
    }
  }
}
