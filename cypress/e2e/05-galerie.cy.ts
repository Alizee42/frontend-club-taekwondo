import { CREDENTIALS } from '../support/credentials';

describe('Galerie', () => {
  beforeEach(() => {
    // Connecté en membre pour avoir le clubId et éviter le 401 sur /api/galeries
    cy.login(CREDENTIALS.membre.email, CREDENTIALS.membre.password);
    cy.visit('/galerie');
  });

  it('affiche le titre', () => {
    cy.contains('h1', /galerie/i).should('be.visible');
  });

  it('affiche skeleton ou contenu après chargement', () => {
    cy.get('.gal-skeleton, .gal-masonry, .gal-empty, .section-error', { timeout: 8000 })
      .should('exist');
    cy.get('.gal-skeleton', { timeout: 8000 }).should('not.exist');
  });

  it('ouvre la lightbox au clic sur une image', () => {
    cy.get('.gal-skeleton', { timeout: 8000 }).should('not.exist');
    cy.get('.gal-masonry').then($m => {
      if ($m.find('.gal-item').length === 0) return;
      cy.get('.gal-item').first().click();
      cy.get('.lightbox').should('be.visible');
      cy.get('.lightbox img').should('be.visible');
    });
  });

  it('ferme la lightbox avec le bouton fermer', () => {
    cy.get('.gal-skeleton', { timeout: 8000 }).should('not.exist');
    cy.get('.gal-masonry').then($m => {
      if ($m.find('.gal-item').length === 0) return;
      cy.get('.gal-item').first().click();
      cy.get('.lightbox__close').click();
      cy.get('.lightbox').should('not.exist');
    });
  });

  it('ferme la lightbox avec Escape', () => {
    cy.get('.gal-skeleton', { timeout: 8000 }).should('not.exist');
    cy.get('.gal-masonry').then($m => {
      if ($m.find('.gal-item').length === 0) return;
      cy.get('.gal-item').first().click();
      cy.get('.lightbox').should('be.visible');
      cy.get('body').type('{esc}');
      cy.get('.lightbox').should('not.exist');
    });
  });

  it('navigue entre images avec les flèches', () => {
    cy.get('.gal-skeleton', { timeout: 8000 }).should('not.exist');
    cy.get('.gal-masonry').then($m => {
      if ($m.find('.gal-item').length < 2) return;
      cy.get('.gal-item').first().click();
      cy.get('.lightbox__counter').invoke('text').then(avant => {
        cy.get('.lightbox__nav--next').click();
        cy.get('.lightbox__counter').invoke('text').should('not.eq', avant);
      });
    });
  });
});
