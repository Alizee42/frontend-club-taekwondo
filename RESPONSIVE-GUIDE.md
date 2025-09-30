# 📱 Guide Responsive - Club Taekwondo

## 🎯 Système de classes utilitaires responsive

### 📐 Breakpoints

- **Mobile** : `max-width: 767px`
- **Tablet** : `768px - 1023px`
- **Desktop** : `min-width: 1024px`

### 🎨 Classes principales

#### Conteneurs
```html
<div class="container">         <!-- Max-width 1200px centré -->
<div class="container-fluid">   <!-- Pleine largeur avec padding -->
```

#### Grilles responsives
```html
<div class="grid grid-cols-3">  <!-- 3 colonnes → 2 sur tablet → 1 sur mobile -->
<div class="grid grid-auto">    <!-- Auto-fit avec largeur minimum -->
```

#### Flexbox responsive
```html
<div class="flex flex-mobile-col">      <!-- Colonne sur mobile -->
<div class="flex justify-between">      <!-- Espace entre éléments -->
```

#### Boutons responsive
```html
<button class="btn btn-primary">        <!-- Pleine largeur sur mobile -->
<button class="btn btn-inline">         <!-- Largeur auto sur mobile -->
```

#### Visibilité responsive
```html
<div class="hidden-mobile">     <!-- Caché sur mobile -->
<div class="visible-mobile">    <!-- Visible uniquement sur mobile -->
<div class="hidden-tablet">     <!-- Caché sur tablet -->
```

### 🎯 Composants principaux responsives

#### 1. Header connecté
- Navigation horizontale → verticale sur mobile
- Logo centré sur mobile
- Boutons empilés sur très petit mobile

#### 2. Page événements parents
- Layout 2 colonnes → 1 colonne sur mobile
- Sidebar en premier sur mobile
- Images réduites sur mobile
- Boutons pleine largeur

#### 3. Cartes
- Grille auto-responsive
- Padding réduit sur mobile
- Animations désactivées sur mobile

### 📋 Checklist responsive

#### ✅ Général
- [ ] Viewport meta tag configuré
- [ ] Font-size minimum 16px sur les inputs
- [ ] Zones de tap minimum 44px
- [ ] Pas de débordement horizontal

#### ✅ Navigation
- [ ] Menu burger sur mobile
- [ ] Navigation accessible au doigt
- [ ] Liens avec padding suffisant

#### ✅ Formulaires
- [ ] Inputs en pleine largeur
- [ ] Labels lisibles
- [ ] Boutons bien espacés
- [ ] Focus visible

#### ✅ Tableaux
- [ ] Scroll horizontal sur mobile
- [ ] Largeur minimum respectée
- [ ] Shadow pour indiquer le scroll

#### ✅ Images
- [ ] Responsive par défaut
- [ ] Pas de débordement
- [ ] Optimisées pour mobile

### 🛠️ Utilisation pratique

#### Exemple page responsive complète
```html
<div class="container">
  <!-- Header -->
  <header class="flex flex-mobile-col justify-between items-center p-4">
    <h1 class="text-2xl">Titre</h1>
    <nav class="nav nav-mobile-stack">
      <a href="#" class="nav-link">Accueil</a>
      <a href="#" class="nav-link">Contact</a>
    </nav>
  </header>

  <!-- Contenu principal -->
  <main class="grid grid-cols-3 gap-4">
    <div class="card">
      <h2 class="text-xl">Carte 1</h2>
      <p>Contenu responsive...</p>
      <button class="btn btn-primary">Action</button>
    </div>
    <!-- Plus de cartes... -->
  </main>
</div>
```

#### Exemple navigation responsive
```html
<nav class="connected-nav">
  <a href="/dashboard" class="nav-link">
    <span class="hidden-mobile">Dashboard</span>
    <i class="ri-dashboard-line visible-mobile"></i>
  </a>
  <a href="/profile" class="nav-link">
    <span class="hidden-mobile">Profil</span>
    <i class="ri-user-line visible-mobile"></i>
  </a>
</nav>
```

### 🎨 Personnalisation

#### Variables CSS disponibles
```css
:root {
  --container-padding: 1rem;     /* Padding conteneur */
  --card-gap: 1rem;             /* Espacement cartes */
  --section-spacing: 2rem;      /* Espacement sections */
  --mobile-max: 767px;          /* Breakpoint mobile */
}
```

#### Classes utilitaires custom
```css
/* Ajouter dans votre composant */
@media (max-width: 767px) {
  .custom-mobile-only {
    display: block;
  }
}
```

### 🚀 Optimisations mobiles

#### Performance
- Animations réduites sur mobile
- Images optimisées
- Lazy loading activé

#### UX Mobile
- Zone de tap 48px minimum
- Pas de hover sur mobile
- Navigation par le pouce
- Contrôles accessibles

#### Tests recommandés
1. **iPhone SE** (375px) - Plus petit écran
2. **iPhone 12** (390px) - Standard iOS
3. **Pixel 5** (393px) - Standard Android
4. **iPad** (768px) - Tablet
5. **iPad Pro** (1024px) - Grande tablet

### 📱 Bonnes pratiques mobile

1. **Touch-friendly** : Boutons min 44px
2. **Performance** : CSS optimisé, pas d'animations complexes
3. **Lisibilité** : Texte min 16px, contrastes respectés
4. **Navigation** : Facilité d'usage au pouce
5. **Formulaires** : Labels clairs, validation immédiate

Cette architecture garantit une expérience utilisateur optimale sur tous les appareils ! 🎉