import { CREDENTIALS } from '../support/credentials';

describe('Boutique', () => {
  beforeEach(() => {
    // Connecté en tant que membre pour avoir le clubId dans le token
    cy.login(CREDENTIALS.membre.email, CREDENTIALS.membre.password);
    cy.visit('/boutique');
  });

  it('affiche le skeleton au chargement puis les produits', () => {
    cy.get('.bq-skeleton, .bq-grid', { timeout: 8000 }).should('exist');
    cy.get('.bq-skeleton', { timeout: 8000 }).should('not.exist');
    cy.get('.bq-grid').should('be.visible');
    cy.get('.bq-card').should('have.length.gte', 1);
  });

  it('chaque carte a un nom, un prix et un sélecteur de taille', () => {
    cy.get('.bq-skeleton', { timeout: 8000 }).should('not.exist');
    cy.get('.bq-card').first().within(() => {
      cy.get('.bq-card__name').should('not.be.empty');
      cy.get('.bq-card__price').should('be.visible');
      cy.get('.bq-select').should('exist');
    });
  });

  it('bouton Ajouter désactivé sans taille', () => {
    cy.get('.bq-skeleton', { timeout: 8000 }).should('not.exist');
    cy.get('.bq-select').first().select('');
    cy.get('.bq-btn-add').first().should('be.disabled');
  });

  it('sélectionner une taille active le bouton Ajouter', () => {
    cy.get('.bq-skeleton', { timeout: 8000 }).should('not.exist');
    cy.get('.bq-select').first().then($sel => {
      const options = $sel.find('option').filter((_, o) => o.getAttribute('value') !== '');
      if (options.length > 0) {
        cy.get('.bq-select').first().select(options.first().val() as string);
        cy.get('.bq-btn-add').first().should('not.be.disabled');
      }
    });
  });

  it('ajouter au panier affiche la confirmation', () => {
    cy.get('.bq-skeleton', { timeout: 8000 }).should('not.exist');
    cy.get('.bq-select').first().then($sel => {
      const options = $sel.find('option').filter((_, o) => o.getAttribute('value') !== '');
      if (options.length > 0) {
        cy.get('.bq-select').first().select(options.first().val() as string);
        cy.get('.bq-btn-add').first().click();
        cy.get('.bq-card__confirm, app-mini-cart', { timeout: 4000 }).should('exist');
      }
    });
  });

  it('le toggle flocage change le prix', () => {
    cy.get('.bq-skeleton', { timeout: 8000 }).should('not.exist');
    cy.get('.bq-card').first().within(() => {
      cy.get('.bq-card__price').invoke('text').then(prixAvant => {
        cy.get('.bq-toggle input[type="checkbox"]').check({ force: true });
        cy.get('.bq-card__price').invoke('text').should('not.eq', prixAvant);
      });
    });
  });
});
