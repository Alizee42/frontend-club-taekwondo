# Frontend — Club Taekwondo

Application web Angular de gestion d'un club de taekwondo. Elle expose un site public ainsi que trois espaces authentifiés (membre, parent, administrateur) et un portail super-administrateur pour la gestion multi-clubs. Les paiements en ligne sont traités via Stripe.

## Stack technique

| Technologie | Version |
|---|---|
| Angular | 20 (standalone components) |
| Angular Material + CDK | ^20.2.0 |
| Bootstrap | ^5.3.5 |
| Chart.js | ^4.5.0 |
| Swiper | ^11.2.10 |
| Stripe.js | ^7.3.0 |
| jwt-decode | ^4.0.0 |
| RxJS | ~7.8.0 |
| TypeScript | ^5.8.2 |
| Tests E2E | Playwright ^1.59.1 |

## Prérequis

- Node.js 20+
- Angular CLI v20 (`npm install -g @angular/cli@20`)
- Backend `backend-club-taekwondo` démarré sur `localhost:8080`

## Installation et lancement

```bash
npm install
npm start
# Application disponible sur http://localhost:4200
```

Le proxy (`proxy.conf.js`) redirige automatiquement toutes les requêtes `/api` vers le backend.

## Scripts disponibles

| Script | Description |
|---|---|
| `npm start` | Serveur de développement avec proxy API |
| `npm run build` | Build de production |
| `npm run build:dev` | Build de développement |
| `npm run watch` | Build en mode watch |
| `npm test` | Tests unitaires (Karma / Jasmine) |
| `npm run test:ci` | Tests unitaires headless (CI) |
| `npm run e2e` | Tests end-to-end (Playwright) |
| `npm run e2e:ui` | Playwright en mode interactif |

## Structure des rôles et des routes

| Rôle | Espace | Préfixe |
|---|---|---|
| Public | Site vitrine | `/` |
| `MEMBRE` | Espace membre | `/membre/*` |
| `PARENT` | Espace parent | `/parent/*` |
| `ADMIN` | Back-office club | `/admin/*` |
| `SUPER_ADMIN` | Back-office multi-clubs | `/super-admin/*` |

### Pages publiques

- **Accueil** — hero, à propos, horaires, professeurs, actualités, avis
- **Boutique** — catalogue équipements (dobok, etc.) avec panier et options (taille, couleur, flocage)
- **Galerie** — galerie photos
- **Événements** — agenda des événements
- **Inscription** — formulaire d'adhésion
- **Contact** — formulaire de contact
- **Connexion / Mot de passe oublié / Réinitialisation**
- **Mentions légales / Politique de confidentialité**

### Espace Membre et Parent

- Tableau de bord
- Suivi des paiements (avec paiement en ligne Stripe)
- Documents
- Commandes boutique
- Événements

### Back-office Admin

- Dashboard avec KPIs en temps réel (avis, paiements, commandes, documents en attente)
- Gestion : membres, professeurs, horaires, actualités, galerie, avis, documents, paiements, commandes, produits, événements
- CMS : configuration du hero, de la section À propos, de la page d'accueil

### Back-office Super-Admin

- Dashboard agrégé multi-clubs
- Gestion complète : clubs, admins, utilisateurs, membres, professeurs, paiements, commandes, documents, galerie, événements, actualités, avis, horaires, logs

## Architecture clé

- **Auth** : JWT stocké en `localStorage`, décodé à chaque requête, déconnexion automatique à expiration. `AuthGuard` protège toutes les routes privées.
- **Multi-club** : `ClubService` / `ClubSelectionService` permettent de filtrer les données par club sélectionné.
- **Stripe** : `StripeService` récupère la clé publique depuis `/api/stripe/public-key` et monte un élément de carte pour la confirmation du paiement.
- **Design system** : composants partagés dans `src/app/shared/ui/` (modales, tableaux, boutons, KPI cards, skeletons, toasts, alertes).

## Déploiement

Le projet inclut un `Dockerfile`, une configuration `nginx.conf` et un `netlify.toml` pour le déploiement sur Netlify ou en conteneur Docker.
