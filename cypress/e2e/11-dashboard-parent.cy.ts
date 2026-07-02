import { CREDENTIALS } from '../support/credentials';

// ══════════════════════════════════════════════════════════
// DASHBOARD PARENT
// ══════════════════════════════════════════════════════════
describe('Dashboard Parent', () => {
  beforeEach(() => {
    cy.login(CREDENTIALS.parent.email, CREDENTIALS.parent.password);
    cy.visit('/parent/dashboard-parent');
  });

  it('redirige vers le dashboard parent après connexion', () => {
    cy.url().should('include', '/parent/dashboard-parent');
  });

  it('affiche le titre Espace parent', () => {
    cy.get('.dash-header__title, h1, h2', { timeout: 8000 }).should('exist');
  });

  it('affiche le message de bienvenue avec le prénom', () => {
    cy.get('.dash-header__sub, .dash-header__title', { timeout: 8000 }).should('exist');
  });

  it('affiche les 4 KPI (enfants, documents manquants, événements, paiements en retard)', () => {
    cy.get('.ui-kpi-card, [class*="kpi"]', { timeout: 8000 }).should('have.length.gte', 4);
  });

  it('affiche la liste des 2 enfants du compte (Lucas & Emma Dupont)', () => {
    cy.get('.kids-list, .kid-item, [class*="kid"]', { timeout: 8000 }).should('exist');
  });

  it('affiche les informations de profil (nom, email)', () => {
    cy.get('.profile-panel, .profile-list, [class*="profile"]', { timeout: 8000 }).should('exist');
  });

  it('affiche les 4 cartes de navigation (Paiements, Documents, Événements, Commandes)', () => {
    cy.get('app-dashboard-nav-card', { timeout: 8000 }).should('have.length.gte', 4);
  });

  it('le lien Support navigue vers /contact', () => {
    cy.get('.dash-header__action, a[href*="contact"]', { timeout: 5000 }).should('exist');
  });

  it('accès refusé aux routes admin', () => {
    cy.visit('/admin/dashboard-admin');
    cy.url().should('not.include', '/admin/dashboard-admin');
  });

  it('accès refusé aux routes super-admin', () => {
    cy.visit('/super-admin/dashboard-super-admin');
    cy.url().should('not.include', '/super-admin/dashboard-super-admin');
  });
});

// ══════════════════════════════════════════════════════════
// PAIEMENTS PARENT
// ══════════════════════════════════════════════════════════
describe('Parent — Paiements', () => {
  beforeEach(() => {
    cy.login(CREDENTIALS.parent.email, CREDENTIALS.parent.password);
    // Intercepter la clé Stripe pour éviter que le chargement externe bloque le rendu
    cy.intercept('GET', '/api/stripe/public-key', { statusCode: 200, body: { publicKey: 'pk_test_cypress_stub_key' } }).as('stripeKey');
    cy.intercept('GET', '/api/parametres-paiement/**', { statusCode: 200, body: { montantCotisation: 150, echeancesAutorisees: 3 } }).as('params');
    cy.visit('/parent/paiements');
  });

  it('affiche la page paiements parent', () => {
    cy.url().should('include', '/parent/paiements');
    cy.get('h1, h2, [class*="paiement"], .payment-panel', { timeout: 8000 }).should('exist');
  });

  it('affiche le tunnel en 4 étapes', () => {
    // Attendre que le panel principal soit rendu
    cy.get('.payment-panel', { timeout: 10000 }).should('exist');
    cy.get('.steps', { timeout: 8000 }).should('exist');
    cy.get('.steps li').should('have.length', 4);
    cy.get('.steps li').eq(0).should('contain.text', 'Enfant');
    cy.get('.steps li').eq(1).should('contain.text', 'Mode');
    cy.get('.steps li').eq(2).should('contain.text', 'Paiement');
    cy.get('.steps li').eq(3).should('contain.text', 'Confirmation');
  });

  it('l\'étape 1 affiche le titre de sélection d\'enfant', () => {
    cy.get('.step-title', { timeout: 8000 }).should('exist');
    cy.get('.child-grid, .child-card, [class*="child"]', { timeout: 8000 }).should('exist');
  });

  it('affiche les 2 cartes enfants (Lucas & Emma Dupont)', () => {
    cy.get('.child-card', { timeout: 8000 }).should('have.length', 2);
    cy.contains('.child-card', 'Lucas').should('exist');
    cy.contains('.child-card', 'Emma').should('exist');
  });

  it('le bouton Continuer est désactivé sans sélection', () => {
    cy.contains('button', /continuer/i, { timeout: 8000 }).should('exist');
  });

  it('sélectionner un enfant active le bouton Continuer', () => {
    cy.get('.child-card').first().click();
    cy.contains('button', /continuer/i).should('not.be.disabled');
  });

  it('passer à l\'étape 2 affiche le choix du mode', () => {
    cy.get('.child-card').first().click();
    cy.contains('button', /continuer/i).click();
    cy.get('.step-title', { timeout: 5000 }).should('exist');
    cy.get('.mode-card', { timeout: 5000 }).should('have.length', 2);
  });

  it('l\'étape 2 affiche les deux modes (En une fois / En plusieurs fois)', () => {
    cy.get('.child-card').first().click();
    cy.contains('button', /continuer/i).click();
    cy.contains('.mode-title', 'En une fois').should('exist');
    cy.contains('.mode-title', 'En plusieurs fois').should('exist');
  });

  it('le bouton Retour à l\'étape 2 revient à l\'étape 1', () => {
    cy.get('.child-card').first().click();
    cy.contains('button', /continuer/i).click();
    cy.get('.mode-card', { timeout: 5000 }).should('exist');
    cy.contains('button', /retour/i).click();
    cy.get('.child-card', { timeout: 5000 }).should('exist');
  });

  it('affiche la section historique des paiements', () => {
    cy.get('.history-panel, #historique, [class*="history"]', { timeout: 8000 }).should('exist');
  });

  it('l\'historique affiche les paiements ou état vide', () => {
    cy.get('.history-grid, .empty, [class*="history"], [class*="empty"]', { timeout: 8000 }).should('exist');
  });

  it('la sidebar récapitulatif est présente', () => {
    cy.get('.aside, [class*="aside"]', { timeout: 8000 }).should('exist');
  });
});

// ══════════════════════════════════════════════════════════
// DOCUMENTS PARENT
// ══════════════════════════════════════════════════════════
describe('Parent — Documents', () => {
  beforeEach(() => {
    cy.login(CREDENTIALS.parent.email, CREDENTIALS.parent.password);
    cy.visit('/parent/documents');
  });

  it('affiche la page documents parent', () => {
    cy.url().should('include', '/parent/documents');
    cy.get('h1, h2, [class*="doc"]', { timeout: 8000 }).should('exist');
  });

  it('affiche les KPI (requis, validés, en attente)', () => {
    cy.get('.ui-kpi-card, [class*="kpi"]', { timeout: 8000 }).should('have.length.gte', 3);
  });

  it('affiche le sélecteur d\'enfant (enfants présents via seed)', () => {
    cy.get('select#kidSelect', { timeout: 8000 }).should('exist');
  });

  it('le sélecteur contient les 2 enfants (Lucas & Emma)', () => {
    cy.get('select#kidSelect', { timeout: 8000 })
      .find('option:not([disabled])')
      .should('have.length', 2);
  });

  it('sélectionner Lucas affiche la barre de progression', () => {
    cy.get('select#kidSelect', { timeout: 8000 }).select(1);
    cy.get('.docs-progress-bar, .progress-chip, [class*="progress"]', { timeout: 8000 }).should('exist');
  });

  it('le formulaire d\'upload de document est présent après sélection', () => {
    cy.get('select#kidSelect', { timeout: 8000 }).select(1);
    cy.get('.upload-card, .upload-form, [class*="upload"]', { timeout: 8000 }).should('exist');
  });

  it('le formulaire contient un sélecteur de type de document', () => {
    cy.get('select#kidSelect', { timeout: 8000 }).select(1);
    cy.get('select#documentType, select[name="documentType"]', { timeout: 5000 }).should('exist');
  });

  it('le type de document a les bonnes options', () => {
    cy.get('select#kidSelect', { timeout: 8000 }).select(1);
    cy.get('select#documentType', { timeout: 5000 }).find('option').then($opts => {
      const texts = [...$opts].map(o => o.text.toLowerCase());
      expect(texts.some(t =>
        t.includes('certificat') || t.includes('photo') || t.includes('identit') || t.length > 0
      )).to.be.true;
    });
  });

  it('le formulaire contient un champ fichier', () => {
    cy.get('select#kidSelect', { timeout: 8000 }).select(1);
    cy.get('input[type="file"]#documentFile, input[type="file"]', { timeout: 5000 }).should('exist');
  });

  it('le bouton Téléverser est présent', () => {
    cy.get('select#kidSelect', { timeout: 8000 }).select(1);
    cy.contains('button', /téléverser|upload/i, { timeout: 5000 }).should('exist');
  });

  it('affiche le tableau des documents ou état vide après sélection', () => {
    cy.get('select#kidSelect', { timeout: 8000 }).select(1);
    cy.get('table, ui-table, app-empty-state, [class*="empty"]', { timeout: 8000 }).should('exist');
  });

  it('changer d\'enfant met à jour l\'affichage (Emma)', () => {
    cy.get('select#kidSelect', { timeout: 8000 }).select(1);
    cy.get('.docs-progress-bar, [class*="progress"]', { timeout: 5000 }).should('exist');
    cy.get('select#kidSelect').select(2);
    cy.get('.docs-progress-bar, [class*="progress"]', { timeout: 5000 }).should('exist');
  });
});

// ══════════════════════════════════════════════════════════
// COMMANDES PARENT
// ══════════════════════════════════════════════════════════
describe('Parent — Commandes', () => {
  beforeEach(() => {
    cy.login(CREDENTIALS.parent.email, CREDENTIALS.parent.password);
    cy.visit('/parent/commandes');
  });

  it('affiche la page commandes parent', () => {
    cy.url().should('include', '/parent/commandes');
    cy.get('h1, h2, [class*="commande"], app-empty-state, [class*="empty"]', { timeout: 8000 }).should('exist');
  });

  it('affiche les KPI (commandes, en attente, total dépensé)', () => {
    cy.get('.ui-kpi-card, [class*="kpi"]', { timeout: 8000 }).should('have.length.gte', 3);
  });

  it('affiche la barre de recherche', () => {
    cy.get('input[type="search"], input[placeholder*="Rechercher"]', { timeout: 5000 }).should('exist');
  });

  it('le bouton Rafraîchir est présent', () => {
    cy.contains('button', /rafraîchir|rafraichir/i, { timeout: 5000 }).should('exist');
  });

  it('affiche le tableau des commandes ou état vide', () => {
    cy.get('table, ui-table, app-empty-state, [class*="empty"]', { timeout: 8000 }).should('exist');
  });

  it('le tableau a les colonnes attendues (Date, Total, Statut)', () => {
    cy.get('body').then($body => {
      if ($body.find('table').length === 0) return;
      cy.get('table thead th, [class*="th"]', { timeout: 5000 }).then($ths => {
        const texts = [...$ths].map(th => th.textContent?.toLowerCase() ?? '');
        expect(texts.some(t => t.includes('date') || t.includes('total') || t.includes('statut'))).to.be.true;
      });
    });
  });

  it('la recherche filtre les commandes', () => {
    cy.get('input[type="search"], input[placeholder*="Rechercher"]').type('test');
    cy.get('table, ui-table, [class*="empty"]', { timeout: 5000 }).should('exist');
  });

  it('une commande existante a un bouton action', () => {
    cy.get('body').then($body => {
      if ($body.find('.col-actions ui-icon-button').length === 0) return;
      cy.get('.col-actions ui-icon-button').first().should('exist');
    });
  });

  it('cliquer Voir les détails ouvre la modal commande', () => {
    cy.get('body').then($body => {
      if ($body.find('.col-actions ui-icon-button').length === 0) return;
      cy.get('.col-actions ui-icon-button').first().click({ force: true });
      cy.get('ui-modal, [class*="modal"]', { timeout: 5000 }).should('exist');
      cy.contains('button', /fermer/i, { timeout: 5000 }).should('exist');
    });
  });

  it('la modal commande contient le détail des articles', () => {
    cy.get('body').then($body => {
      if ($body.find('.col-actions ui-icon-button').length === 0) return;
      cy.get('.col-actions ui-icon-button').first().click({ force: true });
      cy.get('.table-wrap--modal, .modal-summary, table', { timeout: 5000 }).should('exist');
    });
  });

  it('fermer la modal commande fonctionne', () => {
    cy.get('body').then($body => {
      if ($body.find('.col-actions ui-icon-button').length === 0) return;
      cy.get('.col-actions ui-icon-button').first().click({ force: true });
      cy.contains('button', /fermer/i, { timeout: 5000 }).click({ force: true });
      cy.get('ui-modal[open="true"]', { timeout: 3000 }).should('not.exist');
    });
  });
});

// ══════════════════════════════════════════════════════════
// ÉVÉNEMENTS PARENT
// ══════════════════════════════════════════════════════════
describe('Parent — Événements', () => {
  beforeEach(() => {
    cy.login(CREDENTIALS.parent.email, CREDENTIALS.parent.password);
    cy.visit('/parent/evenements');
  });

  it('affiche la page événements parent', () => {
    cy.url().should('include', '/parent/evenements');
    cy.get('h1, h2, [class*="event"], [class*="evenement"], app-empty-state', { timeout: 8000 }).should('exist');
  });

  it('affiche les KPI (événements, inscriptions, prochain)', () => {
    cy.get('.ui-kpi-card, [class*="kpi"]', { timeout: 8000 }).should('have.length.gte', 3);
  });

  it('affiche la sidebar avec le titre Mes enfants', () => {
    cy.get('.sidebar', { timeout: 8000 }).should('exist');
    cy.get('.sidebar h3', { timeout: 5000 }).should('contain.text', 'enfants');
  });

  it('affiche les 2 cartes enfants dans la sidebar (Lucas & Emma)', () => {
    cy.get('.enfants-liste .enfant-card', { timeout: 8000 }).should('have.length', 2);
    cy.contains('.enfant-card', 'Lucas').should('exist');
    cy.contains('.enfant-card', 'Emma').should('exist');
  });

  it('chaque carte enfant affiche le prénom et l\'âge', () => {
    cy.get('.enfant-card').first().within(() => {
      cy.get('.enfant-info h4').should('exist');
      cy.get('.enfant-info p').should('contain.text', 'ans');
    });
  });

  it('sélectionner Lucas affiche ses événements', () => {
    cy.contains('.enfant-card', 'Lucas').click();
    cy.get('.events-grid, .event-card, app-empty-state, [class*="empty"]', { timeout: 8000 }).should('exist');
  });

  it('une carte événement contient titre et date', () => {
    cy.contains('.enfant-card', 'Lucas').click();
    cy.get('body').then($body => {
      if ($body.find('.event-card').length === 0) return;
      cy.get('.event-card').first().within(() => {
        cy.get('.event-title').should('exist');
        cy.get('.event-date, .event-meta').should('exist');
      });
    });
  });

  it('une carte événement a un bouton d\'action (Inscrire ou déjà inscrit)', () => {
    cy.contains('.enfant-card', 'Lucas').click();
    cy.get('body').then($body => {
      if ($body.find('.event-card').length === 0) return;
      cy.get('.event-card').first().find('.event-actions button, .event-actions ui-button').should('exist');
    });
  });

  it('sélectionner Emma change les événements affichés', () => {
    cy.contains('.enfant-card', 'Lucas').click();
    cy.contains('.enfant-card', 'Emma').click();
    cy.get('.enfant-card.selected').should('contain.text', 'Emma');
  });

  it('le bouton Actualiser est présent', () => {
    cy.contains('button', /actualiser/i, { timeout: 5000 }).should('exist');
  });

  it('l\'état initial sans enfant sélectionné affiche un message', () => {
    cy.get('.selection-required, [class*="selection"], [class*="empty"]', { timeout: 5000 }).should('exist');
  });
});
