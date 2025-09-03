import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, map } from 'rxjs';

export interface Produit {
  id: number;
  nom: string;
  description: string;
  prixBase: number;
  prix: number;            // prix unitaire (pas la ligne)
  imageUrl: string;
  taille?: string;
  couleur?: string;
  flocage?: string;
  flocageActif?: boolean;  // ✅ nom normalisé
  quantite?: number;       // par défaut 1
}

type Variante = {
  taille?: string;
  couleur?: string;
  flocage?: string;
  flocageActif?: boolean;
};

@Injectable({ providedIn: 'root' })
export class PanierService {
  private readonly LS_KEY = 'panier';

  // --- État interne
  private readonly _panier$ = new BehaviorSubject<Produit[]>(this.load());

  // --- Observables publics
  readonly panier$ = this._panier$.asObservable();
  readonly items$ = this.panier$; // alias pratique (Header/Boutique)
  readonly count$ = this.panier$.pipe(
    map(items => items.reduce((n, i) => n + (i.quantite ?? 1), 0))
  );
  readonly total$ = this.panier$.pipe(
    map(items =>
      items.reduce((sum, i) => {
        const unit = typeof i.prix === 'number' && isFinite(i.prix) ? i.prix : i.prixBase;
        return sum + unit * (i.quantite ?? 1);
      }, 0)
    )
  );
  readonly cartCount$ = this.count$; // compat header existant

  // --- Signal pour ouvrir le mini-panier depuis la Boutique
  private readonly _openCart$ = new Subject<void>();
  readonly openCart$ = this._openCart$.asObservable();

  // ===== API sync =====
  getPanier(): Produit[] {
    return this._panier$.value;
  }

  setPanier(panier: Produit[]): void {
    const norm = panier.map(p => this.normalizeItem(p));
    this._panier$.next(norm);
    this.persist();
  }

  // ===== Ajout / maj / suppression =====
  ajouterAuPanier(produit: Produit, quantite = 1): void {
    const items = [...this._panier$.value];

    // Normalise l’item ajouté (prix unitaire, quantite mini 1, nom champ flocageActif)
    const toAdd = this.normalizeItem({ ...produit, quantite });

    const idx = this.findIndex(toAdd.id, {
      taille: toAdd.taille,
      couleur: toAdd.couleur,
      flocage: toAdd.flocage,
      flocageActif: toAdd.flocageActif
    });

    if (idx >= 0) {
      const current = items[idx];
      const q = (current.quantite ?? 1) + (toAdd.quantite ?? 1);
      items[idx] = { ...current, quantite: Math.min(99, q) };
    } else {
      items.unshift(toAdd);
    }

    this._panier$.next(items);
    this.persist();
  }

  setQuantite(id: number, quantite: number, variante: Variante = {}): void {
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
    const targetKey = this.keyOf({ id, ...variante });
    const items = this._panier$.value.filter(p => this.keyOf(p) !== targetKey);
    this._panier$.next(items);
    this.persist();
  }

  viderPanier(): void {
    this._panier$.next([]);
    this.persist();
  }

  // --- Ouvrir le mini-panier dans le header (Boutique -> Header)
  openCart(): void {
    this._openCart$.next();
  }

  // ===== Stripe / backend payload =====
  /** Renvoie un tableau simple à poster au backend (montants recalculés côté serveur). */
  toCheckoutPayload() {
    return this._panier$.value.map(i => ({
      productId: i.id,
      quantity: i.quantite ?? 1,
      meta: {
        taille: i.taille,
        couleur: i.couleur,
        flocage: i.flocage,
        flocageActif: i.flocageActif
      }
    }));
  }

  // ===== Helpers =====
  private adjust(id: number, delta: number, variante: Variante): void {
    const idx = this.findIndex(id, variante);
    if (idx < 0) return;
    const items = [...this._panier$.value];
    const cur = items[idx];
    const q = (cur.quantite ?? 1) + delta;
    if (q <= 0) {
      items.splice(idx, 1);
    } else {
      items[idx] = { ...cur, quantite: Math.min(99, q) };
    }
    this._panier$.next(items);
    this.persist();
  }

  private persist(): void {
    localStorage.setItem(this.LS_KEY, JSON.stringify(this._panier$.value));
  }

  /** Charge + normalise les éléments (quantité, prix unitaire, compat `floquageActif` -> `flocageActif`). */
  private load(): Produit[] {
    try {
      const raw = localStorage.getItem(this.LS_KEY);
      const arr: Produit[] = raw ? JSON.parse(raw) : [];
      return arr.map(p => this.normalizeItem(p));
    } catch {
      return [];
    }
  }

  /** Normalise un item: quantite>=1, prix unitaire valide, champ `flocageActif` cohérent (compat `floquageActif`). */
  private normalizeItem(p: Partial<Produit>): Produit {
    // compat: si ancien champ 'floquageActif' existe, on le mappe sur 'flocageActif'
    const flocageActif =
      (p as any).flocageActif ??
      (p as any).floquageActif ?? // compat
      false;

    const prixUnitaire =
      typeof p.prix === 'number' && isFinite(p.prix) ? p.prix : (p.prixBase ?? 0);

    return {
      id: Number(p.id!),
      nom: String(p.nom ?? ''),
      description: String(p.description ?? ''),
      prixBase: Number(p.prixBase ?? prixUnitaire ?? 0),
      prix: Number(prixUnitaire),
      imageUrl: String(p.imageUrl ?? ''),
      taille: p.taille,
      couleur: p.couleur,
      flocage: p.flocage,
      flocageActif: !!flocageActif,
      quantite: Math.max(1, Number(p.quantite ?? 1))
    };
  }

  private keyOf(p: Partial<Produit>): string {
    // clé logique = id + variantes (flocage seulement si activé)
    return [
      p.id,
      p.taille ?? '',
      p.couleur ?? '',
      (p.flocageActif ? (p.flocage ?? '') : '')
    ].join('|');
  }

  private findIndex(id: number, variante: Variante): number {
    const targetKey = this.keyOf({
      id,
      taille: variante.taille,
      couleur: variante.couleur,
      flocage: variante.flocage,
      flocageActif: variante.flocageActif
    });
    return this._panier$.value.findIndex(p => this.keyOf(p) === targetKey);
  }
}
