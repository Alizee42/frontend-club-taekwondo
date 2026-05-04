# Audit KPI – Application Club Taekwondo

> Dernière mise à jour : mai 2026  
> Objectif : uniformisation complète des indicateurs clés (KPI) sur l'ensemble des 4 rôles (Admin, Super-Admin, Membre, Parent).

---

## 1. Composants partagés

### `ui-kpi-card`

Sélecteur : `<ui-kpi-card>`  
Chemin : `src/app/shared/ui/kpi-card/kpi-card.component.*`

| Input | Type | Défaut | Description |
|---|---|---|---|
| `icon` | `string` | `''` | Classe Remix Icon (ex. `ri-user-line`) |
| `label` | `string` | `''` | Libellé affiché sous la valeur |
| `value` | `string \| number` | `''` | Valeur principale (chiffre, texte, devise) |
| `meta` | `string` | `''` | Sous-texte descriptif optionnel |
| `tone` | `string` | `'neutral'` | Couleur de l'accent (voir tableau des tons) |
| `badge` | `string` | `''` | Pastille texte optionnelle (ex. `+12%`) |
| `badgeTone` | `string` | `'neutral'` | Ton de la pastille badge |
| `loading` | `boolean` | `false` | Affiche un skeleton pendant le chargement |
| `trend` | `string` | `''` | Texte de tendance (ex. `+3 ce mois`) |
| `trendUp` | `boolean \| null` | `null` | `true`=vert↑, `false`=rouge↓, `null`=neutre |

**Exemple d'utilisation :**
```html
<ui-kpi-card
  icon="ri-user-line"
  label="Membres"
  [value]="nbMembres"
  tone="primary"
  [loading]="isLoading"
  trend="+3 ce mois"
  [trendUp]="true">
</ui-kpi-card>
```

---

### `ui-kpi-grid`

Sélecteur : `<ui-kpi-grid>`  
Chemin : `src/app/shared/ui/kpi-grid/kpi-grid.component.*`

| Input | Type | Défaut | Description |
|---|---|---|---|
| `cols` | `number` | `3` | Nombre de colonnes (1–4) |

La grille passe en 2 colonnes sur tablette et 1 colonne sur mobile automatiquement.

---

## 2. Tableau des tons

| Ton | Couleur accent | Usage recommandé |
|---|---|---|
| `primary` / `blue` | `var(--brand-primary)` | Total général, chiffre principal |
| `success` / `green` | `var(--color-success)` | Éléments validés, actifs, en stock |
| `warning` / `amber` | `var(--color-warning)` | En attente, vigilance |
| `danger` / `red` | `var(--color-danger)` | Erreurs, refus, rupture de stock |
| `info` / `teal` | `#0891B2` | Statistiques secondaires |
| `purple` | `#7C3AED` | Prochain événement, date |
| `neutral` | `var(--color-border)` | Valeur nulle ou non significative |

**Ton dynamique :**
```html
[tone]="nbEnAttente > 0 ? 'warning' : 'neutral'"
[tone]="nbRupture > 0 ? 'danger' : 'neutral'"
```

---

## 3. Inventaire complet par rôle

### 3.1 Admin

#### Tableau de bord (`dashboard`)
| KPI | Icône | Ton | Source |
|---|---|---|---|
| Total membres | `ri-group-line` | primary | `membres.length` |
| Événements actifs | `ri-calendar-event-line` | success | `evenements.filter(e => e.actif)` |
| Revenus du mois | `ri-money-euro-circle-line` | blue | `commandes` (filtre mois) |
| Documents en attente | `ri-file-warning-line` | warning | `documents.filter(EN_ATTENTE)` |

#### Gestion des événements (`gestion-evenements`)
| KPI | Icône | Ton | Source |
|---|---|---|---|
| Événements | `ri-calendar-event-line` | primary | `evenements.length` |
| Inscriptions totales | `ri-team-line` | info | `Σ evenement.nbInscrits` |
| Événements actifs | `ri-calendar-check-line` | success | `evenements.filter(e => e.actif)` |
| Prochain rendez-vous | `ri-map-pin-time-line` | purple | date du prochain événement |

#### Gestion des professeurs (`gestion-professeurs`)
| KPI | Icône | Ton | Source |
|---|---|---|---|
| Professeurs | `ri-user-star-line` | primary | `professeurs.length` |
| Avec photo | `ri-image-line` | success | `professeurs.filter(p => !!p.photo)` |
| Avec réseaux sociaux | `ri-share-line` | info | `professeurs.filter(p => p.facebook \|\| p.instagram \|\| p.linkedin)` |

#### Gestion des commandes (`gestion-commande`)
| KPI | Icône | Ton | Source |
|---|---|---|---|
| Commandes | `ri-shopping-cart-line` | primary | `commandes.length` |
| Chiffre d'affaires | `ri-money-euro-circle-line` | success | `Σ commande.montantTotal` |
| En attente | `ri-time-line` | warning/neutral | `commandes.filter(statut === 'en attente')` |
| Annulées | `ri-close-circle-line` | danger/neutral | `commandes.filter(statut === 'annule')` |

#### Gestion des documents (`gestion-documents`)
| KPI | Icône | Ton | Source |
|---|---|---|---|
| Documents total | `ri-file-list-3-line` | primary | `Σ utilisateur.documents.length` |
| Validés | `ri-checkbox-circle-line` | success | `Σ documents.filter(status === 'validé')` |
| En attente | `ri-time-line` | warning/neutral | `Σ documents.filter(status === 'en_attente')` |
| Refusés | `ri-close-circle-line` | danger/neutral | `Σ documents.filter(status === 'refusé')` |

#### Gestion des avis (`gestion-avis`)
| KPI | Icône | Ton | Source |
|---|---|---|---|
| Avis | `ri-chat-3-line` | primary | `avis.length` |
| Approuvés | `ri-checkbox-circle-line` | success | `avis.filter(approuve === true)` |
| En attente | `ri-time-line` | warning/neutral | `avis.filter(approuve !== true)` |
| Note moyenne | `ri-star-line` | purple | `Σ note / count` + `' / 5'` |

#### Gestion des actualités (`gestion-actualites`)
| KPI | Icône | Ton | Source |
|---|---|---|---|
| Actualités | `ri-newspaper-line` | primary | `actualites.length` |
| À la une | `ri-star-line` | purple | `actualites.filter(isFeatured)` |
| Type événement | `ri-calendar-line` | info | `actualites.filter(typeActu === 'evenement')` |

#### Gestion des produits (`gestion-produits`)
| KPI | Icône | Ton | Source |
|---|---|---|---|
| Produits | `ri-price-tag-3-line` | primary | `produits.length` |
| En stock | `ri-checkbox-circle-line` | success | `produits.filter(stock > 0)` |
| En rupture | `ri-close-circle-line` | danger/neutral | `produits.filter(stock === 0)` |

#### Gestion des utilisateurs (`gestion-utilisateurs`)
| KPI | Icône | Ton | Source |
|---|---|---|---|
| Utilisateurs | `ri-group-line` | primary | `utilisateurs.length` |
| Membres | `ri-user-line` | info | `utilisateurs.filter(role === 'MEMBRE')` |
| Parents | `ri-parent-line` | purple | `utilisateurs.filter(role === 'PARENT')` |

---

### 3.2 Super-Admin

#### Clubs (`clubs`)
| KPI | Icône | Ton | Source |
|---|---|---|---|
| Clubs | `ri-building-line` | primary | `clubs.length` |
| Avec logo | `ri-image-line` | success | `clubs.filter(c => !!c.logo)` |
| Avec RIB | `ri-bank-line` | info | `clubs.filter(c => !!c.rib)` |

#### Admins (`admins`)
| KPI | Icône | Ton | Source |
|---|---|---|---|
| Administrateurs | `ri-shield-user-line` | primary | `admins.length` |
| Clubs couverts | `ri-building-4-line` | info | `new Set(admins.map(a => a.clubId)).size` |

#### Membres (`membres-super-admin`)
| KPI | Icône | Ton | Source |
|---|---|---|---|
| Membres | `ri-group-line` | primary | `membres.length` |
| Clubs représentés | `ri-building-line` | info | `new Set(membres.map(m => m.clubId)).size` |

#### Documents (`documents-super-admin`)
| KPI | Icône | Ton | Source |
|---|---|---|---|
| Documents total | `ri-file-list-3-line` | primary | `rows.length` |
| Validés | `ri-checkbox-circle-line` | success | `rows.filter(normalizeStatus(statut) === 'validé')` |
| En attente | `ri-time-line` | warning/neutral | `rows.filter(normalizeStatus === 'en_attente')` |
| Refusés | `ri-close-circle-line` | danger/neutral | `rows.filter(normalizeStatus === 'refusé')` |

#### Enseignants (`enseignants-super-admin`)
| KPI | Icône | Ton | Source |
|---|---|---|---|
| Enseignants | `ri-user-star-line` | primary | `enseignants.length` |
| Clubs représentés | `ri-building-line` | info | `new Set(enseignants.map(e => e.clubId)).size` |

#### Avis (`avis-super-admin`)
| KPI | Icône | Ton | Source |
|---|---|---|---|
| Avis | `ri-chat-3-line` | primary | `avis.length` |
| Approuvés | `ri-checkbox-circle-line` | success | `avis.filter(approuve === true)` |
| En attente | `ri-time-line` | warning/neutral | `avis.filter(approuve !== true)` |
| Note moyenne | `ri-star-line` | purple | `Σ note / count` + `' / 5'` |

#### Actualités (`actualites-super-admin`)
| KPI | Icône | Ton | Source |
|---|---|---|---|
| Actualités | `ri-newspaper-line` | primary | `actualites.length` |
| À la une | `ri-star-line` | purple | `actualites.filter(isFeatured)` |
| Type événement | `ri-calendar-line` | info | `actualites.filter(typeActu === 'evenement')` |

#### Utilisateurs (`utilisateurs-super-admin`)
| KPI | Icône | Ton | Source |
|---|---|---|---|
| Utilisateurs | `ri-group-line` | primary | `utilisateurs.length` |
| Admins | `ri-shield-user-line` | danger | `utilisateurs.filter(role === 'ADMIN')` |
| Membres | `ri-user-line` | info | `utilisateurs.filter(role === 'MEMBRE')` |

---

### 3.3 Membre

#### Documents (`documents`)
| KPI | Icône | Ton | Source |
|---|---|---|---|
| Documents requis | `ri-file-list-3-line` | primary | `requiredDocuments.length` |
| Validés | `ri-checkbox-circle-line` | success | `documents.filter(d.status === 'validé')` |
| En attente | `ri-time-line` | warning/neutral | `documents.filter(d.status === 'en_attente')` |

#### Événements (`evenements-membre`)
| KPI | Icône | Ton | Source |
|---|---|---|---|
| Événements | `ri-calendar-event-line` | primary | `evenements.length` |
| Mes inscriptions | `ri-user-add-line` | success | `evenements.filter(isInscrit)` |
| Prochain | `ri-map-pin-time-line` | purple | date du prochain événement inscrit |

#### Commandes (`commandes-membre`)
| KPI | Icône | Ton | Source |
|---|---|---|---|
| Commandes | `ri-shopping-bag-3-line` | primary | `commandes.length` |
| En attente | `ri-time-line` | warning/neutral | `commandes.filter(statut === 'EN_ATTENTE')` |
| Total dépensé | `ri-money-euro-circle-line` | blue | `Σ commande.montantTotal` |

---

### 3.4 Parent

#### Documents (`documents-parent`)
| KPI | Icône | Ton | Source |
|---|---|---|---|
| Documents requis | `ri-file-list-3-line` | primary | `requiredDocuments.length` |
| Validés | `ri-checkbox-circle-line` | success | `documents.filter(normalizeStatus(d.status) === 'validé')` |
| En attente | `ri-time-line` | warning/neutral | `documents.filter(normalizeStatus === 'en_attente')` |

#### Événements (`evenements-parent`)
| KPI | Icône | Ton | Source |
|---|---|---|---|
| Événements | `ri-calendar-event-line` | primary | `evenements.length` |
| Inscriptions | `ri-user-add-line` | success | `inscriptionsEnfants.length` |
| Prochain | `ri-map-pin-time-line` | purple | date du prochain événement |

#### Commandes (`commandes-parent`)
| KPI | Icône | Ton | Source |
|---|---|---|---|
| Commandes | `ri-shopping-bag-3-line` | primary | `commandes.length` |
| En attente | `ri-time-line` | warning/neutral | `commandes.filter(statut === 'EN_ATTENTE')` |
| Total dépensé | `ri-money-euro-circle-line` | blue | `Σ commande.montantTotal` |

---

## 4. Règles architecturales

### Getters TypeScript uniquement
Les valeurs KPI sont toujours des `get` calculés dans le composant — jamais de variables mises à jour manuellement ni d'appels API supplémentaires.

```typescript
// ✅ Correct
get nbEnAttente() {
  return this.commandes.filter(c => c.statut === 'EN_ATTENTE').length;
}

// ❌ Incorrect
this.nbEnAttente = this.commandes.filter(...).length; // variable mutée
```

### Pas de style inline
Toutes les couleurs passent par les tons CSS (`tone="warning"`) — jamais de `style="color:..."`.

### `[loading]` systématique
Toutes les `ui-kpi-card` sur des pages avec chargement async portent `[loading]="isLoading"` pour afficher le skeleton.

### Convention des statuts de commande
- Côté **Admin** (données API brutes) : statut en minuscules `'en attente'`, `'annule'`
- Côté **Membre / Parent** (service Angular) : statut en majuscules `'EN_ATTENTE'`, `'PAYEE'`

### Normalisation des statuts documents
Utiliser `normalizeStatus()` de `doc-utils` pour les pages Super-Admin et Parent qui reçoivent des valeurs hétérogènes depuis l'API.

---

## 5. Pages exclues

| Page | Raison |
|---|---|
| Login / Register | Pages d'authentification — aucune donnée métier |
| Profil utilisateur | Page de formulaire — pas d'agrégation |
| Paramètres | Page de configuration |
| Page 404 / Erreur | Pas de données |

---

## 6. Résumé chiffré

| Rôle | Pages avec KPI | KPI totaux |
|---|---|---|
| Admin | 9 | 31 |
| Super-Admin | 8 | 27 |
| Membre | 3 | 9 |
| Parent | 3 | 9 |
| **Total** | **23** | **76** |
