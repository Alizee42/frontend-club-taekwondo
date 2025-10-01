# Header Unifié - Documentation

## Problème résolu

L'application avait deux composants header séparés :
- `header.component.ts` - pour les utilisateurs non connectés
- `connected-header.component.ts` - pour les utilisateurs connectés

Cela créait des problèmes de synchronisation et de cohérence.

## Solution

### 1. Unification des headers

Le composant `header.component.ts` a été modifié pour gérer les deux états :
- Menu public (non connecté)
- Menu privé (connecté)

### 2. Logique conditionnelle

Le template utilise maintenant `*ngIf="isUserLoggedIn"` pour afficher/masquer les éléments selon l'état de connexion :

```html
<!-- Bouton connexion (visible uniquement si déconnecté) -->
<li *ngIf="!isUserLoggedIn">
  <a [routerLink]="['/connexion']">Connexion</a>
</li>

<!-- Dropdown utilisateur (visible uniquement si connecté) -->
<div class="user-dropdown" *ngIf="isUserLoggedIn">
  <!-- contenu du dropdown -->
</div>

<!-- Notifications (visible uniquement si connecté) -->
<div class="notification-icon" *ngIf="isUserLoggedIn">
  <!-- icône notifications -->
</div>
```

### 3. Propriété calculée robuste

Pour éviter les problèmes de synchronisation, une propriété calculée `isUserLoggedIn` est utilisée :

```typescript
get isUserLoggedIn(): boolean {
  return this.isLoggedIn && !!this.user && !!this.auth.getToken();
}
```

Cette propriété vérifie :
- L'état local `isLoggedIn`
- La présence d'un utilisateur `user`
- La présence d'un token valide

### 4. Détection de changement forcée

Le composant utilise `ChangeDetectorRef` pour forcer la mise à jour du DOM lors des changements d'état :

```typescript
this.auth.authState$.subscribe((s) => {
  this.isLoggedIn = s.isConnecte;
  this.user = s.user;
  
  // Forcer la détection de changement
  this.cdr.detectChanges();
});
```

### 5. Nettoyage du code

- Suppression de `connected-header.component.ts`
- Suppression des imports de `ConnectedHeaderComponent` dans `app.component.ts`
- Mise à jour du template `app.component.html` pour utiliser uniquement `<app-header>`

## Avantages

✅ **Cohérence** : Un seul header pour toute l'application
✅ **Synchronisation** : Plus de problèmes de désynchronisation entre headers
✅ **Maintenance** : Plus facile à maintenir et déboguer
✅ **Performance** : Moins de composants à gérer
✅ **UX** : Transition fluide entre états connecté/déconnecté

## Fonctionnalités préservées

- Système de notifications
- Dropdown utilisateur avec nom du parent
- Panier avec sélection de bénéficiaire
- Modales de connexion et paiement
- Navigation responsive
- Déconnexion sécurisée

## Debug

Une méthode de diagnostic est disponible dans la console :

```javascript
// Dans la console du navigateur
angular.getComponent(document.querySelector('app-header')).debugAuthState();
```

Cette méthode affiche l'état complet de l'authentification pour faciliter le débogage.