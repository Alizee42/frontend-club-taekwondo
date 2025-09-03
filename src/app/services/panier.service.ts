import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';

// Définition de l'interface Produit (inchangée)
export interface Produit {
  id: number;
  nom: string;
  description: string;
  prixBase: number;
  prix: number;
  imageUrl: string;
  taille?: string;
  couleur?: string;
  floquageActif?: boolean;
  flocage?: string;
  quantite?: number;
}

type Variante = {
  taille?: string;
  couleur?: string;
  flocage?: string;
  floquageActif?: boolean;
};

@Injectable({ providedIn: 'root' })
export class PanierService {
  private readonly LS_KEY = 'panier';

  // État interne
  private readonly _panier$ = new BehaviorSubject<Produit[]>(this.load());

  // Observables publics
  readonly panier$ = this._panier$.asObservable();
  readonly count$ = this.panier$.pipe(
    map(items => items.reduce((n, i) => n + (i.quantite ?? 1), 0))
  );
  readonly total$ = this.panier$.pipe(
    map(items =>
      items.reduce(
        (sum, i) => sum + ((i.prix ?? i.prixBase) || 0) * (i.quantite ?? 1),
        0
      )
    )
  );
  // Compat avec un header existant qui consomme cartCount$
  readonly cartCount$ = this.count$;

  // ===== API sync =====
  getPanier(): Produit[] {
    return this._panier$.value;
  }

  setPanier(panier: Produit[]): void {
    // normalise les quantités manquantes et le prix
    const norm = panier.map(p => ({
      ...p,
      quantite: Math.max(1, Number(p.quantite ?? 1)),
      prix: Number.isFinite(p.prix) ? p.prix : p.prixBase
    }));
    this._panier$.next(norm);
    this.persist();
  }

  // ===== Ajout / maj / suppression =====
  ajouterAuPanier(produit: Produit, quantite = 1): void {
    const items = [...this._panier$.value];
    const idx = this.findIndex(produit.id, {
      taille: produit.taille,
      couleur: produit.couleur,
      flocage: produit.flocage,
      floquageActif: produit.floquageActif
    });

    if (idx >= 0) {
      // fusionner par variante
      const current = items[idx];
      const q = (current.quantite ?? 1) + Math.max(1, Number(quantite) || 1);
      items[idx] = { ...current, quantite: Math.min(99, q) };
    } else {
      items.unshift({
        ...produit,
        quantite: Math.max(1, Number(quantite) || 1),
        prix: Number.isFinite(produit.prix) ? produit.prix : produit.prixBase
      });
    }

    this._panier$.next(items);
    this.persist();
  }

  setQuantite(
    id: number,
    quantite: number,
    variante: Variante = {}
  ): void {
    const idx = this.findIndex(id, variante);
    if (idx < 0) return;
    const items = [...this._panier$.value];
    items[idx] = {
      ...items[idx],
      quantite: Math.max(1, Math.min(99, Number(quantite) || 1))
    };
    this._panier$.next(items);
    this.persist();
  }

  incrementer(id: number, variante: Variante = {}): void {
    this.adjust(id, +1, variante);
  }

  decrementer(id: number, variante: Variante = {}): void {
    this.adjust(id, -1, variante);
  }

  supprimer(id: number, variante: Variante = {}): void {
    const items = this._panier$.value.filter(
      p => this.keyOf(p) !== this.keyOf({ id, ...variante })
    );
    this._panier$.next(items);
    this.persist();
  }

  viderPanier(): void {
    this._panier$.next([]);
    this.persist();
  }

  // ===== Stripe / backend payload =====
  /** Renvoie un tableau simple à poster au backend */
  toCheckoutPayload() {
    return this._panier$.value.map(i => ({
      productId: i.id,
      quantity: i.quantite ?? 1,
      meta: {
        taille: i.taille,
        couleur: i.couleur,
        flocage: i.flocage,
        floquageActif: i.floquageActif
      }
      // ⚠️ Les montants doivent être re-calculés côté backend pour éviter la fraude.
    }));
  }

  // ===== Helpers =====
  private adjust(id: number, delta: number, variante: Variante): void {
    const idx = this.findIndex(id, variante);
    if (idx < 0) return;
    const items = [...this._panier$.value];
    const q = (items[idx].quantite ?? 1) + delta;
    if (q <= 0) {
      items.splice(idx, 1);
    } else {
      items[idx] = { ...items[idx], quantite: Math.min(99, q) };
    }
    this._panier$.next(items);
    this.persist();
  }

  private persist(): void {
    localStorage.setItem(this.LS_KEY, JSON.stringify(this._panier$.value));
  }

  private load(): Produit[] {
    try {
      const raw = localStorage.getItem(this.LS_KEY);
      const arr: Produit[] = raw ? JSON.parse(raw) : [];
      return arr.map(p => ({
        ...p,
        quantite: Math.max(1, Number(p.quantite ?? 1)),
        prix: Number.isFinite(p.prix) ? p.prix : p.prixBase
      }));
    } catch {
      return [];
    }
  }

  private keyOf(p: Partial<Produit>): string {
    // clé logique = id + variantes (flocage seulement si activé)
    return [
      p.id,
      p.taille ?? '',
      p.couleur ?? '',
      p.floquageActif ? (p.flocage ?? '') : ''
    ].join('|');
  }

  private findIndex(id: number, variante: Variante): number {
    const targetKey = this.keyOf({ id, ...variante });
    return this._panier$.value.findIndex(p => this.keyOf(p) === targetKey);
    }
}
