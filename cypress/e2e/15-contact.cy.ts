// ══════════════════════════════════════════════════════════
// PAGE CONTACT
// ══════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────
// STRUCTURE
// ──────────────────────────────────────────────────────────
describe('Page Contact — Structure', () => {
  beforeEach(() => cy.visit('/contact'));

  it('affiche la page contact', () => {
    cy.url().should('include', '/contact');
  });

  it('affiche le hero avec le titre', () => {
    cy.get('.page-hero', { timeout: 8000 }).should('exist');
    cy.get('h1#contactTitle').should('exist');
  });

  it('affiche l\'eyebrow "Nous contacter"', () => {
    cy.get('.page-hero__eyebrow').should('contain.text', 'Nous contacter');
  });

  it('affiche la description dans le hero', () => {
    cy.get('.page-hero', { timeout: 8000 }).find('p').should('exist');
  });

  it('affiche la mise en page contact-layout', () => {
    cy.get('.contact-layout', { timeout: 8000 }).should('exist');
  });

  it('affiche le panneau info du club', () => {
    cy.get('.contact-info', { timeout: 8000 }).should('exist');
  });

  it('affiche le panneau formulaire', () => {
    cy.get('.contact-form-panel', { timeout: 8000 }).should('exist');
  });

  it('affiche le titre du formulaire', () => {
    cy.get('h2#formTitle', { timeout: 8000 }).should('contain.text', 'Envoyer un message');
  });
});

// ──────────────────────────────────────────────────────────
// FORMULAIRE — CHAMPS
// ──────────────────────────────────────────────────────────
describe('Page Contact — Champs du formulaire', () => {
  beforeEach(() => {
    cy.visit('/contact');
    cy.get('.contact-form', { timeout: 8000 }).should('exist');
  });

  it('affiche le champ Nom', () => {
    cy.get('input[name="name"]').should('exist');
  });

  it('affiche le champ Email', () => {
    cy.get('input[name="email"]').should('exist');
  });

  it('affiche le champ Objet', () => {
    cy.get('input[name="objet"]').should('exist');
  });

  it('affiche le champ Message (textarea)', () => {
    cy.get('textarea[name="message"]').should('exist');
  });

  it('affiche le bouton Envoyer', () => {
    cy.get('button[type="submit"]').should('exist');
    cy.get('button[type="submit"]').should('contain.text', 'Envoyer');
  });

  it('le bouton Envoyer est désactivé si le formulaire est vide', () => {
    cy.get('button[type="submit"]').should('be.disabled');
  });
});

// ──────────────────────────────────────────────────────────
// VALIDATION — ERREURS
// ──────────────────────────────────────────────────────────
describe('Page Contact — Validation', () => {
  beforeEach(() => {
    cy.visit('/contact');
    cy.get('.contact-form', { timeout: 8000 }).should('exist');
  });

  it('affiche l\'erreur "Nom requis" si le champ est touché et vide', () => {
    cy.get('input[name="name"]').click().blur();
    cy.contains(/nom requis/i, { timeout: 3000 }).should('exist');
  });

  it('affiche l\'erreur "Email invalide" si email mal formaté', () => {
    cy.get('input[name="email"]').type('pas-un-email').blur();
    cy.contains(/email invalide/i, { timeout: 3000 }).should('exist');
  });

  it('affiche l\'erreur "Objet requis" si le champ est vide et touché', () => {
    cy.get('input[name="objet"]').click().blur();
    cy.contains(/objet requis/i, { timeout: 3000 }).should('exist');
  });

  it('affiche l\'erreur "Message requis" si le champ est vide et touché', () => {
    cy.get('textarea[name="message"]').click().blur();
    cy.contains(/message requis/i, { timeout: 3000 }).should('exist');
  });

  it('affiche l\'erreur "Minimum 10 caractères" si message trop court', () => {
    cy.get('textarea[name="message"]').type('Court').blur();
    cy.contains(/minimum 10|10 caractères/i, { timeout: 3000 }).should('exist');
  });

  it('applique la classe is-invalid au champ nom si invalide', () => {
    cy.get('input[name="name"]').click().blur();
    cy.get('input[name="name"]').should('have.class', 'is-invalid');
  });

  it('applique la classe is-invalid au champ email si invalide', () => {
    cy.get('input[name="email"]').type('mauvais').blur();
    cy.get('input[name="email"]').should('have.class', 'is-invalid');
  });

  it('applique la classe is-invalid à la textarea si vide et touchée', () => {
    cy.get('textarea[name="message"]').click().blur();
    cy.get('textarea[name="message"]').should('have.class', 'is-invalid');
  });

  it('le bouton reste désactivé si formulaire invalide', () => {
    cy.get('input[name="name"]').type('Jean');
    cy.get('input[name="email"]').type('pas-un-email');
    cy.get('button[type="submit"]').should('be.disabled');
  });

  it('le bouton devient actif quand le formulaire est valide', () => {
    cy.get('input[name="name"]').type('Jean Dupont');
    cy.get('input[name="email"]').type('jean@exemple.com');
    cy.get('input[name="objet"]').type('Question sur les horaires');
    cy.get('textarea[name="message"]').type('Bonjour, je voudrais avoir des informations sur les cours.');
    cy.get('button[type="submit"]').should('not.be.disabled');
  });
});

// ──────────────────────────────────────────────────────────
// SOUMISSION
// ──────────────────────────────────────────────────────────
describe('Page Contact — Soumission', () => {
  beforeEach(() => {
    cy.visit('/contact');
    cy.get('.contact-form', { timeout: 8000 }).should('exist');
  });

  it('soumet le formulaire et appelle l\'API', () => {
    cy.intercept('POST', '/api/contact*').as('sendContact');
    cy.get('input[name="name"]').type('Jean Dupont');
    cy.get('input[name="email"]').type('jean@exemple.com');
    cy.get('input[name="objet"]').type('Question sur les horaires');
    cy.get('textarea[name="message"]').type('Bonjour, je voudrais avoir des informations sur les cours.');
    cy.get('button[type="submit"]').click();
    cy.wait('@sendContact');
  });
});

// ──────────────────────────────────────────────────────────
// INFO CLUB
// ──────────────────────────────────────────────────────────
describe('Page Contact — Info club', () => {
  beforeEach(() => {
    cy.visit('/contact');
    cy.get('.contact-layout', { timeout: 8000 }).should('exist');
  });

  it('affiche la section info du club ou le message "aucun club sélectionné"', () => {
    cy.get('body').then($body => {
      if ($body.find('.info-list').length > 0) {
        cy.get('.info-list').should('exist');
      } else {
        cy.contains(/aucun club|choisissez un club/i).should('exist');
      }
    });
  });

  it('affiche le titre de la section info', () => {
    cy.get('h2#clubContactTitle', { timeout: 6000 }).should('exist');
  });

  it('affiche le délai de réponse "Sous 24h"', () => {
    cy.contains(/24h/i, { timeout: 6000 }).should('exist');
  });
});

// ──────────────────────────────────────────────────────────
// ACCESSIBILITÉ — PAGE PUBLIQUE
// ──────────────────────────────────────────────────────────
describe('Page Contact — Accès', () => {
  it('accessible sans connexion', () => {
    cy.clearAllCookies();
    cy.clearAllLocalStorage();
    cy.visit('/contact');
    cy.url().should('include', '/contact');
    cy.get('h1#contactTitle', { timeout: 8000 }).should('exist');
  });

  it('accessible avec le rôle membre', () => {
    cy.login('membre@test.com', 'Test1234!');
    cy.visit('/contact');
    cy.get('h1#contactTitle', { timeout: 8000 }).should('exist');
  });
});
