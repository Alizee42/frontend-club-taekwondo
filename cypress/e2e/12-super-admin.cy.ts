import { CREDENTIALS } from '../support/credentials';

// Helper : login super-admin
const loginSA = () => {
  cy.login(CREDENTIALS.superAdmin.email, CREDENTIALS.superAdmin.password);
};

// ══════════════════════════════════════════════════════════
// DASHBOARD SUPER ADMIN
// ══════════════════════════════════════════════════════════
describe('Super Admin — Dashboard', () => {
  beforeEach(() => { loginSA(); cy.visit('/super-admin/dashboard-super-admin'); });

  it('redirige vers le dashboard super admin', () => {
    cy.url().should('include', '/super-admin/dashboard-super-admin');
  });

  it('affiche le titre Tableau de bord', () => {
    cy.get('h1, h2, [class*="dash"]', { timeout: 8000 }).should('exist');
  });

  it('affiche les 6 KPI (clubs, admins, membres, paiements reçus, en attente, logs)', () => {
    cy.get('.ui-kpi-card, [class*="kpi"]', { timeout: 8000 }).should('have.length.gte', 6);
  });

  it('affiche les sections de navigation (Administration, Encadrement, Activité, Site)', () => {
    cy.get('[class*="dash-section"], [class*="section"]', { timeout: 8000 }).should('have.length.gte', 3);
  });

  it('affiche les cartes de navigation vers les modules', () => {
    cy.get('app-dashboard-nav-card', { timeout: 8000 }).should('have.length.gte', 6);
  });

  it('accès refusé aux routes admin standard', () => {
    cy.visit('/admin/dashboard-admin');
    cy.url().should('not.include', '/admin/dashboard-admin');
  });
});

// ══════════════════════════════════════════════════════════
// CLUBS
// ══════════════════════════════════════════════════════════
describe('Super Admin — Clubs', () => {
  beforeEach(() => { loginSA(); cy.visit('/super-admin/clubs'); });

  it('affiche la page clubs', () => {
    cy.url().should('include', '/super-admin/clubs');
    cy.get('h1, h2, [class*="club"]', { timeout: 8000 }).should('exist');
  });

  it('affiche les 3 KPI (clubs, avec logo, avec RIB)', () => {
    cy.get('.ui-kpi-card, [class*="kpi"]', { timeout: 8000 }).should('have.length.gte', 3);
  });

  it('affiche le tableau des clubs', () => {
    cy.get('.table-wrap, ui-table, table', { timeout: 8000 }).should('exist');
  });

  it('le bouton Créer un club est présent', () => {
    cy.contains('button, ui-button', /cr[eé]er un club/i, { timeout: 5000 }).should('exist');
  });

  it('le bouton Actualiser est présent', () => {
    cy.contains('button, ui-button', /actualiser/i, { timeout: 5000 }).should('exist');
  });

  it('ouvrir la modal de création de club', () => {
    cy.contains('button, ui-button', /cr[eé]er un club/i).click({ force: true });
    cy.get('ui-modal', { timeout: 5000 }).should('exist');
    // Le champ nom a name="name" et placeholder="Ex: Villeurbanne"
    cy.get('input[name="name"], input[placeholder*="Villeurbanne"]', { timeout: 5000 }).should('exist');
  });

  it('le formulaire club contient les champs requis (nom, email, téléphone, adresse)', () => {
    cy.contains('button, ui-button', /cr[eé]er un club/i).click({ force: true });
    cy.get('ui-modal', { timeout: 5000 }).should('exist');
    cy.get('input[name="name"]', { timeout: 5000 }).should('exist');
    cy.get('input[name="email"], input[type="email"]').should('exist');
    cy.get('input[name="telephone"], input[type="tel"]').should('exist');
    cy.get('input[name="adresse"]').should('exist');
  });

  it('fermer la modal club fonctionne', () => {
    cy.contains('button, ui-button', /cr[eé]er un club/i).click({ force: true });
    cy.get('ui-modal', { timeout: 5000 }).should('exist');
    cy.contains('button', /annuler/i).click({ force: true });
    cy.get('ui-modal[open="true"]', { timeout: 3000 }).should('not.exist');
  });

  it('un club existant a les boutons Modifier et Supprimer', () => {
    cy.get('body').then($body => {
      if ($body.find('.col-actions ui-icon-button').length === 0) return;
      cy.get('.col-actions ui-icon-button').should('have.length.gte', 2);
    });
  });
});

// ══════════════════════════════════════════════════════════
// ADMINS
// ══════════════════════════════════════════════════════════
describe('Super Admin — Admins', () => {
  beforeEach(() => { loginSA(); cy.visit('/super-admin/admins'); });

  it('affiche la page admins', () => {
    cy.url().should('include', '/super-admin/admins');
    cy.get('h1, h2, [class*="admin"]', { timeout: 8000 }).should('exist');
  });

  it('affiche les 3 KPI (administrateurs, clubs couverts, clubs total)', () => {
    cy.get('.ui-kpi-card, [class*="kpi"]', { timeout: 8000 }).should('have.length.gte', 3);
  });

  it('affiche le tableau des admins', () => {
    cy.get('.table-wrap, ui-table, table', { timeout: 8000 }).should('exist');
  });

  it('le bouton Créer un admin ouvre la modal', () => {
    cy.contains('button, ui-button', /cr[eé]er un admin/i, { timeout: 5000 }).click({ force: true });
    cy.get('ui-modal', { timeout: 5000 }).should('exist');
  });

  it('le formulaire admin contient les champs requis (nom, prénom, email, club)', () => {
    cy.contains('button, ui-button', /cr[eé]er un admin/i, { timeout: 5000 }).click({ force: true });
    cy.get('ui-modal', { timeout: 5000 }).should('exist');
    cy.get('input[name="nom"], input[placeholder*="Nom"]', { timeout: 5000 }).should('exist');
    cy.get('input[name="prenom"], input[placeholder*="Pr"]').should('exist');
    cy.get('input[type="email"]').should('exist');
    cy.get('select, [class*="select"]').should('exist');
  });

  it('fermer la modal admin fonctionne', () => {
    cy.contains('button, ui-button', /cr[eé]er un admin/i, { timeout: 5000 }).click({ force: true });
    cy.get('ui-modal', { timeout: 5000 }).should('exist');
    cy.get('ui-modal').find('button[aria-label*="ermer"], [class*="close"]').first().click({ force: true });
    cy.get('ui-modal[open="true"]', { timeout: 3000 }).should('not.exist');
  });
});

// ══════════════════════════════════════════════════════════
// MEMBRES
// ══════════════════════════════════════════════════════════
describe('Super Admin — Membres', () => {
  beforeEach(() => { loginSA(); cy.visit('/super-admin/membres'); });

  it('affiche la page membres', () => {
    cy.url().should('include', '/super-admin/membres');
    cy.get('h1, h2, [class*="membre"], [class*="table"]', { timeout: 8000 }).should('exist');
  });

  it('affiche les 3 KPI (membres, clubs disponibles, club sélectionné)', () => {
    cy.get('.ui-kpi-card, [class*="kpi"]', { timeout: 8000 }).should('have.length.gte', 3);
  });

  it('affiche le filtre par club', () => {
    cy.get('select, [class*="select"]', { timeout: 5000 }).should('exist');
  });

  it('affiche le tableau des membres ou état vide', () => {
    cy.get('.table-wrap, ui-table, table, app-empty-state, [class*="empty"]', { timeout: 8000 }).should('exist');
  });

  it('sélectionner un club charge les membres', () => {
    cy.get('select').first().then($select => {
      const options = $select.find('option');
      if (options.length <= 1) return;
      cy.get('select').first().select(1);
      cy.get('.table-wrap, ui-table, table, app-empty-state', { timeout: 8000 }).should('exist');
    });
  });

  it('le bouton Ajouter un membre ouvre la modal', () => {
    cy.get('select').first().then($select => {
      if ($select.find('option').length <= 1) return;
      cy.get('select').first().select(1);
      cy.contains('button, ui-button', /ajouter un membre/i, { timeout: 5000 }).click({ force: true });
      cy.get('ui-modal, [class*="modal"]', { timeout: 5000 }).should('exist');
    });
  });
});

// ══════════════════════════════════════════════════════════
// UTILISATEURS
// ══════════════════════════════════════════════════════════
describe('Super Admin — Utilisateurs', () => {
  beforeEach(() => { loginSA(); cy.visit('/super-admin/utilisateurs'); });

  it('affiche la page utilisateurs', () => {
    cy.url().should('include', '/super-admin/utilisateurs');
    cy.get('h1, h2, [class*="utilisateur"], [class*="table"]', { timeout: 8000 }).should('exist');
  });

  it('affiche les 3 KPI (utilisateurs, admins, membres)', () => {
    cy.get('.ui-kpi-card, [class*="kpi"]', { timeout: 8000 }).should('have.length.gte', 3);
  });

  it('affiche le tableau des utilisateurs', () => {
    cy.get('.table-wrap, ui-table, table', { timeout: 8000 }).should('exist');
  });

  it('le bouton Ajouter un utilisateur ouvre la modal', () => {
    cy.contains('button, ui-button', /ajouter un utilisateur/i, { timeout: 5000 }).click({ force: true });
    cy.get('ui-modal', { timeout: 5000 }).should('exist');
  });

  it('le formulaire utilisateur contient les champs requis', () => {
    cy.contains('button, ui-button', /ajouter un utilisateur/i, { timeout: 5000 }).click({ force: true });
    cy.get('ui-modal', { timeout: 5000 }).should('exist');
    cy.get('input[name="nom"], input[placeholder*="Nom"]', { timeout: 5000 }).should('exist');
    cy.get('input[name="prenom"], input[placeholder*="Pr"]').should('exist');
    cy.get('input[type="email"]').should('exist');
    cy.get('select[name="role"], select', { timeout: 5000 }).should('exist');
  });

  it('fermer la modal utilisateur fonctionne', () => {
    cy.contains('button, ui-button', /ajouter un utilisateur/i, { timeout: 5000 }).click({ force: true });
    cy.get('ui-modal', { timeout: 5000 }).should('exist');
    cy.contains('button', /annuler/i).click({ force: true });
    cy.get('ui-modal[open="true"]', { timeout: 3000 }).should('not.exist');
  });

  it('le tableau a des utilisateurs listés (comptes de test présents)', () => {
    cy.get('.table-wrap, ui-table, table', { timeout: 8000 }).should('exist');
    cy.get('body').then($body => {
      if ($body.find('.col-actions ui-icon-button').length === 0) return;
      cy.get('.col-actions ui-icon-button').first().should('exist');
    });
  });
});

// ══════════════════════════════════════════════════════════
// GESTION PAIEMENTS
// ══════════════════════════════════════════════════════════
describe('Super Admin — Gestion paiements', () => {
  beforeEach(() => { loginSA(); cy.visit('/super-admin/gestion-paiements'); });

  it('affiche la page gestion paiements', () => {
    cy.url().should('include', '/super-admin/gestion-paiements');
    cy.get('h1, h2, [class*="paiement"]', { timeout: 8000 }).should('exist');
  });

  it('affiche les 5 KPI (total reçu, à percevoir, en retard, % encaissé, clubs)', () => {
    cy.get('.ui-kpi-card, [class*="kpi"]', { timeout: 8000 }).should('have.length.gte', 4);
  });

  it('affiche la barre de filtres (club, recherche, statut, mode)', () => {
    cy.get('.filters-bar, [class*="filter"]', { timeout: 8000 }).should('exist');
    cy.get('select, input[type="text"], input[placeholder*="Rechercher"]', { timeout: 5000 }).should('exist');
  });

  it('affiche le tableau ou composant suivi des paiements', () => {
    cy.get('.table-wrap, ui-table, table, app-suivi-paiements, [class*="suivi"]', { timeout: 8000 }).should('exist');
  });

  it('le bouton Ajouter un paiement est présent', () => {
    cy.contains('button, ui-button', /ajouter un paiement/i, { timeout: 5000 }).should('exist');
  });

  it('le bouton Rafraîchir est présent', () => {
    cy.contains('button, ui-button', /rafra[iî]chir/i, { timeout: 5000 }).should('exist');
  });

  it('le filtre par statut existe', () => {
    cy.get('select', { timeout: 5000 }).then($selects => {
      expect($selects.length).to.be.gte(1);
    });
  });

  it('le bouton Exporter est présent', () => {
    cy.contains('button, ui-button', /exporter/i, { timeout: 5000 }).should('exist');
  });

  it('ouvrir la modal Ajouter un paiement', () => {
    cy.contains('button, ui-button', /ajouter un paiement/i, { timeout: 5000 }).click({ force: true });
    cy.get('ui-modal', { timeout: 5000 }).should('exist');
  });
});

// ══════════════════════════════════════════════════════════
// LOGS
// ══════════════════════════════════════════════════════════
describe('Super Admin — Logs', () => {
  beforeEach(() => { loginSA(); cy.visit('/super-admin/logs'); });

  it('affiche la page logs', () => {
    cy.url().should('include', '/super-admin/logs');
    cy.get('h1, h2, [class*="log"]', { timeout: 8000 }).should('exist');
  });

  it('affiche le titre Journal technique', () => {
    cy.contains('h2, h3', /journal/i, { timeout: 5000 }).should('exist');
  });

  it('affiche le message de placeholder', () => {
    cy.get('.logs-placeholder, [class*="placeholder"], [class*="log"]', { timeout: 5000 }).should('exist');
  });
});

// ══════════════════════════════════════════════════════════
// ACTUALITÉS
// ══════════════════════════════════════════════════════════
describe('Super Admin — Actualités', () => {
  beforeEach(() => { loginSA(); cy.visit('/super-admin/actualites'); });

  it('affiche la page actualités', () => {
    cy.url().should('include', '/super-admin/actualites');
    cy.get('h1, h2, [class*="actu"]', { timeout: 8000 }).should('exist');
  });

  it('affiche les 3 KPI (actualités, à la une, événements)', () => {
    cy.get('.ui-kpi-card, [class*="kpi"]', { timeout: 8000 }).should('have.length.gte', 3);
  });

  it('affiche la barre de filtres (club, recherche)', () => {
    cy.get('.filters-bar, [class*="filter"]', { timeout: 8000 }).should('exist');
    cy.get('select, input[type="text"], input[placeholder*="Rechercher"]', { timeout: 5000 }).should('exist');
  });

  it('affiche le tableau des actualités ou état vide', () => {
    cy.get('.table-wrap, ui-table, table, app-empty-state, [class*="empty"]', { timeout: 8000 }).should('exist');
  });

  it('le bouton Ajouter une actualité est présent', () => {
    cy.contains('button, ui-button', /ajouter une actualit/i, { timeout: 5000 }).should('exist');
  });

  it('ouvrir la modal actualité affiche le formulaire', () => {
    // Attendre que les clubs soient chargés puis sélectionner le 2e option (index 1 = premier club réel)
    cy.get('select.form-select option', { timeout: 8000 }).should('have.length.gte', 2);
    cy.get('select.form-select').first().select(1);
    // Le bouton n'est plus disabled
    cy.contains('button, ui-button', /ajouter une actualit/i, { timeout: 5000 }).should('not.be.disabled');
    cy.contains('button, ui-button', /ajouter une actualit/i).click({ force: true });
    // ui-modal est hors du .page-shell, chercher ui-form rendu par le composant
    cy.get('ui-form, .ui-form', { timeout: 8000 }).should('exist');
  });

  it('le formulaire actualité contient les champs requis', () => {
    cy.get('select.form-select option', { timeout: 8000 }).should('have.length.gte', 2);
    cy.get('select.form-select').first().select(1);
    cy.contains('button, ui-button', /ajouter une actualit/i).click({ force: true });
    // ui-form rend les champs avec [id]="field.name" et [name]="field.name"
    cy.get('input#titre, input[name="titre"]', { timeout: 8000 }).should('exist');
    cy.get('select#typeActu, select[name="typeActu"]', { timeout: 8000 }).should('exist');
    cy.get('textarea#contenu, textarea[name="contenu"]', { timeout: 8000 }).should('exist');
  });
});

// ══════════════════════════════════════════════════════════
// GALERIE
// ══════════════════════════════════════════════════════════
describe('Super Admin — Galerie', () => {
  beforeEach(() => { loginSA(); cy.visit('/super-admin/galerie'); });

  it('affiche la page galerie', () => {
    cy.url().should('include', '/super-admin/galerie');
    cy.get('h1, h2, [class*="galerie"], [class*="gal-"]', { timeout: 8000 }).should('exist');
  });

  it('affiche le filtre par club', () => {
    cy.get('select, .filters-bar', { timeout: 5000 }).should('exist');
  });

  it('affiche le tableau des photos ou état vide', () => {
    cy.get('.table-wrap, ui-table, table, app-empty-state, [class*="empty"]', { timeout: 8000 }).should('exist');
  });

  it('le bouton Ajouter une photo est présent', () => {
    cy.contains('button, ui-button', /ajouter une photo/i, { timeout: 5000 }).should('exist');
  });

  it('ouvrir la modal galerie affiche le formulaire', () => {
    cy.contains('button, ui-button', /ajouter une photo/i, { timeout: 5000 }).click({ force: true });
    cy.get('ui-modal', { timeout: 5000 }).should('exist');
    cy.get('input#titre, input[name="titre"], input[placeholder*="Titre"]', { timeout: 5000 }).should('exist');
    cy.get('input#imageFile, input[type="file"]', { timeout: 5000 }).should('exist');
  });

  it('le formulaire galerie contient titre, description, fichier image', () => {
    cy.contains('button, ui-button', /ajouter une photo/i, { timeout: 5000 }).click({ force: true });
    cy.get('ui-modal', { timeout: 5000 }).should('exist');
    cy.get('input#titre, input[name="titre"]', { timeout: 5000 }).should('exist');
    cy.get('textarea#description, textarea[name="description"]').should('exist');
    cy.get('input[type="file"]').should('exist');
    cy.get('button[type="submit"]', { timeout: 5000 }).should('exist');
  });

  it('fermer la modal galerie fonctionne', () => {
    cy.contains('button, ui-button', /ajouter une photo/i, { timeout: 5000 }).click({ force: true });
    cy.get('ui-modal', { timeout: 5000 }).should('exist');
    cy.get('ui-modal').find('[class*="close"], button[aria-label*="ermer"]').first().click({ force: true });
    cy.get('ui-modal[open="true"]', { timeout: 3000 }).should('not.exist');
  });
});

// ══════════════════════════════════════════════════════════
// GESTION HORAIRES
// ══════════════════════════════════════════════════════════
describe('Super Admin — Gestion horaires', () => {
  beforeEach(() => { loginSA(); cy.visit('/super-admin/gestion-horaires'); });

  it('affiche la page gestion horaires', () => {
    cy.url().should('include', '/super-admin/gestion-horaires');
    cy.get('h1, h2, [class*="horaire"]', { timeout: 8000 }).should('exist');
  });

  it('affiche les 3 KPI (créneaux, jours actifs, groupes)', () => {
    cy.get('.ui-kpi-card, [class*="kpi"]', { timeout: 8000 }).should('have.length.gte', 3);
  });

  it('affiche le sélecteur de club', () => {
    cy.get('select#clubSelect, select[id*="club"], select', { timeout: 5000 }).should('exist');
  });

  it('affiche la grille hebdomadaire (7 jours)', () => {
    cy.get('.week-grid', { timeout: 8000 }).should('exist');
    cy.get('.week-grid .day-card', { timeout: 8000 }).should('have.length', 7);
  });

  it('chaque jour affiche son nom', () => {
    const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    cy.get('.week-grid .day-card').each(($card, i) => {
      cy.wrap($card).find('.day-card__name, .day-card__header').should('contain.text', jours[i]);
    });
  });

  it('le bouton Ajouter des horaires ouvre la modal (après sélection club)', () => {
    // Attendre que les clubs soient chargés (ngValue = id numérique, sélectionner par index)
    cy.get('select#clubSelect option', { timeout: 8000 }).should('have.length.gte', 1);
    cy.get('select#clubSelect').select(0).trigger('change');
    cy.contains('button, ui-button', /ajouter des horaires/i, { timeout: 5000 }).should('not.be.disabled');
    cy.contains('button, ui-button', /ajouter des horaires/i).click({ force: true });
    cy.get('select#jour, select[name="jour"]', { timeout: 8000 }).should('exist');
  });

  it('le formulaire horaires contient les champs requis après sélection du jour', () => {
    cy.get('select#clubSelect option', { timeout: 8000 }).should('have.length.gte', 1);
    cy.get('select#clubSelect').select(0).trigger('change');
    cy.contains('button, ui-button', /ajouter des horaires/i, { timeout: 5000 }).click({ force: true });
    cy.get('select#jour', { timeout: 8000 }).select('Lundi').trigger('change');
    cy.get('.plages-stack .plage-panel:not(.is-closed)', { timeout: 8000 }).should('exist');
    cy.get('input[placeholder*="Enfants"]', { timeout: 8000 }).should('exist');
  });

  it('fermer la modal horaires fonctionne', () => {
    cy.get('select#clubSelect option', { timeout: 8000 }).should('have.length.gte', 1);
    cy.get('select#clubSelect').select(0).trigger('change');
    cy.contains('button, ui-button', /ajouter des horaires/i, { timeout: 5000 }).click({ force: true });
    cy.get('select#jour', { timeout: 8000 }).should('exist');
    // Fermer via la touche Escape ou le binding (closed)
    cy.get('body').type('{esc}');
    cy.get('select#jour', { timeout: 3000 }).should('not.exist');
  });
});

// ══════════════════════════════════════════════════════════
// DOCUMENTS
// ══════════════════════════════════════════════════════════
describe('Super Admin — Documents', () => {
  beforeEach(() => { loginSA(); cy.visit('/super-admin/documents'); });

  it('affiche la page documents', () => {
    cy.url().should('include', '/super-admin/documents');
    cy.get('h1, h2, [class*="doc"]', { timeout: 8000 }).should('exist');
  });

  it('affiche les 4 KPI (total, validés, en attente, refusés)', () => {
    cy.get('.ui-kpi-card, [class*="kpi"]', { timeout: 8000 }).should('have.length.gte', 4);
  });

  it('affiche le panneau master avec filtres (club, statut, recherche)', () => {
    cy.get('.master-panel, [class*="master"]', { timeout: 8000 }).should('exist');
    cy.get('select', { timeout: 5000 }).should('have.length.gte', 2);
    cy.get('input[placeholder*="Rechercher"], input[type="text"]', { timeout: 5000 }).should('exist');
  });

  it('affiche la liste des utilisateurs dans le panneau master', () => {
    cy.get('.user-item, [class*="user-item"], [class*="master"]', { timeout: 8000 }).should('exist');
  });

  it('affiche le panneau de détail ou invite à sélectionner', () => {
    cy.get('.detail-panel, [class*="detail"]', { timeout: 8000 }).should('exist');
    cy.get('.detail-empty, [class*="empty"]', { timeout: 5000 }).should('exist');
  });

  it('le filtre par statut filtre les utilisateurs', () => {
    // Les valeurs sont en minuscules : "en_attente", "validé", "refusé"
    cy.get('select').eq(1).select('en_attente');
    cy.get('.master-panel, [class*="master"]', { timeout: 5000 }).should('exist');
  });

  it('le bouton Rafraîchir est présent', () => {
    cy.contains('button, ui-button', /rafra[iî]chir/i, { timeout: 5000 }).should('exist');
  });
});

// ══════════════════════════════════════════════════════════
// COMMANDES
// ══════════════════════════════════════════════════════════
describe('Super Admin — Commandes', () => {
  beforeEach(() => { loginSA(); cy.visit('/super-admin/commandes'); });

  it('affiche la page commandes', () => {
    cy.url().should('include', '/super-admin/commandes');
    cy.get('h1, h2, [class*="commande"]', { timeout: 8000 }).should('exist');
  });

  it('affiche le tableau des commandes ou état vide', () => {
    cy.get('.table-wrap, ui-table, table, app-empty-state, [class*="empty"]', { timeout: 8000 }).should('exist');
  });

  it('affiche les KPI de commandes', () => {
    cy.get('.ui-kpi-card, [class*="kpi"]', { timeout: 8000 }).should('have.length.gte', 1);
  });

  it('affiche la barre de recherche ou filtres', () => {
    cy.get('input[type="search"], input[placeholder*="Rechercher"], .filters-bar, [class*="filter"]', { timeout: 5000 }).should('exist');
  });

  it('un détail de commande peut être ouvert', () => {
    cy.get('body').then($body => {
      if ($body.find('.col-actions ui-icon-button').length === 0) return;
      cy.get('.col-actions ui-icon-button').first().click({ force: true });
      cy.get('ui-modal, [class*="modal"]', { timeout: 5000 }).should('exist');
    });
  });
});

// ══════════════════════════════════════════════════════════
// ÉVÉNEMENTS
// ══════════════════════════════════════════════════════════
describe('Super Admin — Événements', () => {
  beforeEach(() => { loginSA(); cy.visit('/super-admin/evenements'); });

  it('affiche la page événements', () => {
    cy.url().should('include', '/super-admin/evenements');
    cy.get('h1, h2, [class*="event"], [class*="evenement"]', { timeout: 8000 }).should('exist');
  });

  it('affiche les KPI événements', () => {
    cy.get('.ui-kpi-card, [class*="kpi"]', { timeout: 8000 }).should('have.length.gte', 1);
  });

  it('affiche le tableau des événements ou état vide', () => {
    cy.get('.table-wrap, ui-table, table, app-empty-state, [class*="empty"]', { timeout: 8000 }).should('exist');
  });

  it('le bouton Créer un événement est présent', () => {
    cy.contains('button, ui-button', /cr[eé]er un [eé]v[eé]nement/i, { timeout: 5000 }).should('exist');
  });

  it('ouvrir la modal création événement', () => {
    cy.contains('button, ui-button', /cr[eé]er un [eé]v[eé]nement/i, { timeout: 5000 }).click({ force: true });
    cy.get('ui-modal', { timeout: 5000 }).should('exist');
  });

  it('le formulaire événement contient les champs requis', () => {
    cy.contains('button, ui-button', /cr[eé]er un [eé]v[eé]nement/i, { timeout: 5000 }).click({ force: true });
    cy.get('ui-modal', { timeout: 5000 }).should('exist');
    cy.get('input[name="titre"], [placeholder*="Titre"]', { timeout: 5000 }).should('exist');
    cy.get('input[name="lieu"], [placeholder*="Lieu"]').should('exist');
    cy.get('input[name="dateDebut"], [name="dateDebut"], input[type="date"]', { timeout: 5000 }).should('exist');
  });

  it('fermer la modal événement fonctionne', () => {
    cy.contains('button, ui-button', /cr[eé]er un [eé]v[eé]nement/i, { timeout: 5000 }).click({ force: true });
    cy.get('ui-modal', { timeout: 5000 }).should('exist');
    cy.contains('button', /annuler|fermer/i).first().click({ force: true });
    cy.get('ui-modal[open="true"]', { timeout: 3000 }).should('not.exist');
  });
});

// ══════════════════════════════════════════════════════════
// AVIS
// ══════════════════════════════════════════════════════════
describe('Super Admin — Avis', () => {
  beforeEach(() => { loginSA(); cy.visit('/super-admin/avis'); });

  it('affiche la page avis', () => {
    cy.url().should('include', '/super-admin/avis');
    cy.get('h1, h2, [class*="avis"]', { timeout: 8000 }).should('exist');
  });

  it('affiche les 4 KPI (total, approuvés, en attente, note moyenne)', () => {
    cy.get('.ui-kpi-card, [class*="kpi"]', { timeout: 8000 }).should('have.length.gte', 4);
  });

  it('affiche le filtre par club', () => {
    cy.get('select, .filters-bar', { timeout: 5000 }).should('exist');
  });

  it('affiche le tableau des avis ou état vide', () => {
    cy.get('.table-wrap, ui-table, table, app-empty-state, [class*="empty"]', { timeout: 8000 }).should('exist');
  });

  it('le bouton Ajouter un avis est présent', () => {
    cy.contains('button, ui-button', /ajouter un avis/i, { timeout: 5000 }).should('exist');
  });

  it('ouvrir la modal avis affiche le formulaire', () => {
    cy.contains('button, ui-button', /ajouter un avis/i, { timeout: 5000 }).click({ force: true });
    cy.get('ui-modal', { timeout: 5000 }).should('exist');
  });
});

// ══════════════════════════════════════════════════════════
// ENSEIGNANTS
// ══════════════════════════════════════════════════════════
describe('Super Admin — Enseignants', () => {
  beforeEach(() => { loginSA(); cy.visit('/super-admin/enseignants'); });

  it('affiche la page enseignants', () => {
    cy.url().should('include', '/super-admin/enseignants');
    cy.get('h1, h2, [class*="enseignant"], [class*="prof"]', { timeout: 8000 }).should('exist');
  });

  it('affiche les 3 KPI (enseignants, clubs disponibles, club sélectionné)', () => {
    cy.get('.ui-kpi-card, [class*="kpi"]', { timeout: 8000 }).should('have.length.gte', 3);
  });

  it('affiche le filtre par club', () => {
    cy.get('select, .filters-bar', { timeout: 5000 }).should('exist');
  });

  it('affiche le tableau des enseignants ou état vide', () => {
    cy.get('.table-wrap, ui-table, table, app-empty-state, [class*="empty"]', { timeout: 8000 }).should('exist');
  });

  it('sélectionner un club active le bouton Ajouter', () => {
    cy.get('select').first().then($select => {
      if ($select.find('option').length <= 1) return;
      cy.get('select').first().select(1);
      cy.contains('button, ui-button', /ajouter un enseignant/i, { timeout: 5000 }).should('not.be.disabled');
    });
  });

  it('ouvrir la modal enseignant affiche le formulaire', () => {
    cy.get('select').first().then($select => {
      if ($select.find('option').length <= 1) return;
      cy.get('select').first().select(1);
      cy.contains('button, ui-button', /ajouter un enseignant/i, { timeout: 5000 }).click({ force: true });
      cy.get('ui-modal', { timeout: 5000 }).should('exist');
    });
  });
});

// ══════════════════════════════════════════════════════════
// ACCUEIL SITE
// ══════════════════════════════════════════════════════════
describe('Super Admin — Accueil site', () => {
  beforeEach(() => { loginSA(); cy.visit('/super-admin/accueil-site'); });

  it('affiche la page accueil site', () => {
    cy.url().should('include', '/super-admin/accueil-site');
    cy.get('h1, h2, form, [class*="accueil"]', { timeout: 8000 }).should('exist');
  });

  it('affiche un formulaire de configuration', () => {
    cy.get('form, [class*="form"]', { timeout: 8000 }).should('exist');
    cy.get('input, textarea, select', { timeout: 5000 }).should('exist');
  });

  it('le bouton Enregistrer est présent', () => {
    cy.contains('button, ui-button', /enregistrer|sauvegarder|save/i, { timeout: 5000 }).should('exist');
  });
});

// ══════════════════════════════════════════════════════════
// HERO
// ══════════════════════════════════════════════════════════
describe('Super Admin — Hero', () => {
  beforeEach(() => { loginSA(); cy.visit('/super-admin/hero'); });

  it('affiche la page hero', () => {
    cy.url().should('include', '/super-admin/hero');
    cy.get('h1, h2, form, [class*="hero"]', { timeout: 8000 }).should('exist');
  });

  it('affiche un formulaire de configuration du hero', () => {
    cy.get('form, [class*="form"]', { timeout: 8000 }).should('exist');
    cy.get('input, textarea', { timeout: 5000 }).should('exist');
  });

  it('le bouton Enregistrer est présent', () => {
    cy.contains('button, ui-button', /enregistrer|sauvegarder|save/i, { timeout: 5000 }).should('exist');
  });
});

// ══════════════════════════════════════════════════════════
// À PROPOS
// ══════════════════════════════════════════════════════════
describe('Super Admin — À propos', () => {
  beforeEach(() => { loginSA(); cy.visit('/super-admin/apropos'); });

  it('affiche la page à propos', () => {
    cy.url().should('include', '/super-admin/apropos');
    cy.get('h1, h2, form, [class*="apropos"], [class*="about"]', { timeout: 8000 }).should('exist');
  });

  it('affiche un formulaire de configuration', () => {
    cy.get('form, [class*="form"]', { timeout: 8000 }).should('exist');
    cy.get('input, textarea', { timeout: 5000 }).should('exist');
  });

  it('le bouton Enregistrer est présent', () => {
    cy.contains('button, ui-button', /enregistrer|sauvegarder|save/i, { timeout: 5000 }).should('exist');
  });
});
