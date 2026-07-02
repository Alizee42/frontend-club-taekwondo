import { CREDENTIALS } from '../support/credentials';

// ══════════════════════════════════════════════════════════
// PAGE NOTIFICATIONS — accessible à tous les rôles connectés
// ══════════════════════════════════════════════════════════
describe('Page Notifications — Structure', () => {
  beforeEach(() => {
    cy.login(CREDENTIALS.membre.email, CREDENTIALS.membre.password);
    cy.visit('/notifications');
  });

  it('affiche la page notifications', () => {
    cy.url().should('include', '/notifications');
  });

  it('affiche le hero avec le titre Notifications', () => {
    cy.get('.page-hero', { timeout: 8000 }).should('exist');
    cy.get('h1#notifTitle').should('contain.text', 'Notifications');
  });

  it('affiche le sous-titre Votre espace personnel', () => {
    cy.get('.page-hero__eyebrow').should('contain.text', 'Votre espace personnel');
  });

  it('affiche la description de la page', () => {
    cy.get('.page-hero p').should('contain.text', 'messages');
  });

  it('affiche la sidebar des filtres', () => {
    cy.get('.notif-sidebar', { timeout: 8000 }).should('exist');
    cy.get('.notif-sidebar__title').should('contain.text', 'Filtres');
  });

  it('affiche les 3 boutons de filtre (Toutes, Non lues, Lues)', () => {
    cy.get('.notif-filter-btn', { timeout: 8000 }).should('have.length', 3);
    cy.get('.notif-filter-btn').eq(0).should('contain.text', 'Toutes');
    cy.get('.notif-filter-btn').eq(1).should('contain.text', 'Non lues');
    cy.get('.notif-filter-btn').eq(2).should('contain.text', 'Lues');
  });

  it('le filtre Toutes est actif par défaut', () => {
    cy.get('.notif-filter-btn.is-active', { timeout: 8000 }).should('contain.text', 'Toutes');
  });

  it('affiche le compteur total dans le filtre Toutes', () => {
    cy.get('.notif-filter-btn').eq(0).find('.notif-filter-btn__count').should('exist');
  });

  it('affiche le contenu principal (notif-main)', () => {
    cy.get('.notif-main', { timeout: 8000 }).should('exist');
  });

  it('affiche une liste ou un état vide (pas de spinner infini)', () => {
    cy.get('.notif-loading, .notif-spin', { timeout: 10000 }).should('not.exist');
    cy.get('.notif-list, .notif-empty', { timeout: 8000 }).should('exist');
  });
});

// ══════════════════════════════════════════════════════════
// FILTRES
// ══════════════════════════════════════════════════════════
describe('Page Notifications — Filtres', () => {
  beforeEach(() => {
    cy.login(CREDENTIALS.membre.email, CREDENTIALS.membre.password);
    cy.visit('/notifications');
    // Attendre la fin du chargement
    cy.get('.notif-main', { timeout: 8000 }).should('exist');
    cy.get('.notif-spin', { timeout: 10000 }).should('not.exist');
  });

  it('cliquer sur Non lues active ce filtre', () => {
    cy.get('.notif-filter-btn').eq(1).click();
    cy.get('.notif-filter-btn.is-active').should('contain.text', 'Non lues');
  });

  it('cliquer sur Lues active ce filtre', () => {
    cy.get('.notif-filter-btn').eq(2).click();
    cy.get('.notif-filter-btn.is-active').should('contain.text', 'Lues');
  });

  it('cliquer sur Toutes revient au filtre par défaut', () => {
    cy.get('.notif-filter-btn').eq(1).click();
    cy.get('.notif-filter-btn').eq(0).click();
    cy.get('.notif-filter-btn.is-active').should('contain.text', 'Toutes');
  });

  it('le filtre Non lues affiche un état vide ou des notifications non lues', () => {
    cy.get('.notif-filter-btn').eq(1).click();
    cy.get('.notif-list, .notif-empty', { timeout: 5000 }).should('exist');
  });

  it('le filtre Lues affiche un état vide ou des notifications lues', () => {
    cy.get('.notif-filter-btn').eq(2).click();
    cy.get('.notif-list, .notif-empty', { timeout: 5000 }).should('exist');
  });

  it('l\'état vide affiche un message approprié selon le filtre', () => {
    cy.get('.notif-filter-btn').eq(1).click();
    cy.get('body').then($body => {
      if ($body.find('.notif-empty').length === 0) return;
      cy.get('.notif-empty__text').should('contain.text', 'non lue');
    });
  });
});

// ══════════════════════════════════════════════════════════
// CARTES DE NOTIFICATION
// ══════════════════════════════════════════════════════════
describe('Page Notifications — Cartes', () => {
  beforeEach(() => {
    cy.login(CREDENTIALS.membre.email, CREDENTIALS.membre.password);
    cy.visit('/notifications');
    cy.get('.notif-spin', { timeout: 10000 }).should('not.exist');
  });

  it('une notification affiche un titre, un type, une date et un message', () => {
    cy.get('body').then($body => {
      if ($body.find('.notif-card').length === 0) return;
      cy.get('.notif-card').first().within(() => {
        cy.get('.notif-card__title').should('exist');
        cy.get('.notif-card__badge').should('exist');
        cy.get('.notif-card__date').should('exist');
        cy.get('.notif-card__message').should('exist');
      });
    });
  });

  it('une notification non lue a la classe notif-card--unread', () => {
    cy.get('body').then($body => {
      if ($body.find('.notif-card--unread').length === 0) return;
      cy.get('.notif-card--unread').first().should('exist');
      cy.get('.notif-card--unread').first().find('.notif-card__dot').should('exist');
    });
  });

  it('une notification non lue a le bouton Marquer comme lu', () => {
    cy.get('body').then($body => {
      if ($body.find('.notif-card--unread').length === 0) return;
      cy.get('.notif-card--unread').first()
        .find('button')
        .contains(/marquer comme lu/i)
        .should('exist');
    });
  });

  it('cliquer Marquer comme lu retire la classe unread', () => {
    cy.get('body').then($body => {
      if ($body.find('.notif-card--unread').length === 0) return;
      cy.get('.notif-card--unread').first()
        .find('button').contains(/marquer comme lu/i)
        .click({ force: true });
      // La carte ne doit plus avoir la classe unread
      cy.get('.notif-card').first().should('not.have.class', 'notif-card--unread');
    });
  });

  it('l\'icône de la notification correspond au type', () => {
    cy.get('body').then($body => {
      if ($body.find('.notif-card').length === 0) return;
      cy.get('.notif-card__icon-wrap').first().find('i').should('exist');
    });
  });

  it('une notification avec lien d\'action a le bouton Voir détail', () => {
    cy.get('body').then($body => {
      if ($body.find('.notif-card').length === 0) return;
      // Conditionnel : seulement si lienAction est présent
      const hasVoirDetail = $body.find('button').toArray()
        .some(b => /voir d[eé]tail/i.test(b.textContent ?? ''));
      if (!hasVoirDetail) return;
      cy.contains('button', /voir d[eé]tail/i).should('exist');
    });
  });
});

// ══════════════════════════════════════════════════════════
// ACTION GLOBALE — Tout marquer comme lu
// ══════════════════════════════════════════════════════════
describe('Page Notifications — Tout marquer comme lu', () => {
  beforeEach(() => {
    cy.login(CREDENTIALS.membre.email, CREDENTIALS.membre.password);
    cy.visit('/notifications');
    cy.get('.notif-spin', { timeout: 10000 }).should('not.exist');
  });

  it('le bouton Tout marquer comme lu est visible s\'il y a des non lues', () => {
    cy.get('body').then($body => {
      if ($body.find('.notif-card--unread').length === 0) return;
      cy.get('.notif-sidebar__actions').should('exist');
      cy.contains('button', /tout marquer comme lu/i).should('exist');
    });
  });

  it('cliquer Tout marquer comme lu supprime toutes les classes unread', () => {
    cy.get('body').then($body => {
      if ($body.find('.notif-card--unread').length === 0) return;
      cy.contains('button', /tout marquer comme lu/i).click({ force: true });
      cy.get('.notif-card--unread', { timeout: 3000 }).should('not.exist');
    });
  });

  it('après Tout marquer comme lu le bouton disparaît', () => {
    cy.get('body').then($body => {
      if ($body.find('.notif-card--unread').length === 0) return;
      cy.contains('button', /tout marquer comme lu/i).click({ force: true });
      cy.get('.notif-sidebar__actions', { timeout: 3000 }).should('not.exist');
    });
  });
});

// ══════════════════════════════════════════════════════════
// ACCÈS ET SÉCURITÉ
// ══════════════════════════════════════════════════════════
describe('Page Notifications — Accès', () => {
  it('un utilisateur non connecté est redirigé vers /connexion', () => {
    cy.clearAllCookies();
    cy.clearAllLocalStorage();
    cy.visit('/notifications');
    cy.url({ timeout: 8000 }).should('include', '/connexion');
  });

  it('accessible au rôle parent', () => {
    cy.login(CREDENTIALS.parent.email, CREDENTIALS.parent.password);
    cy.visit('/notifications');
    cy.url().should('include', '/notifications');
    cy.get('h1#notifTitle', { timeout: 8000 }).should('exist');
  });

  it('accessible au rôle admin', () => {
    cy.login(CREDENTIALS.admin.email, CREDENTIALS.admin.password);
    cy.visit('/notifications');
    cy.url().should('include', '/notifications');
    cy.get('h1#notifTitle', { timeout: 8000 }).should('exist');
  });

  it('accessible au rôle super-admin', () => {
    cy.login(CREDENTIALS.superAdmin.email, CREDENTIALS.superAdmin.password);
    cy.visit('/notifications');
    cy.url().should('include', '/notifications');
    cy.get('h1#notifTitle', { timeout: 8000 }).should('exist');
  });
});
