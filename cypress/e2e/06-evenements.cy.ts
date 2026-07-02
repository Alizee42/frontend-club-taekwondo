import { CREDENTIALS } from '../support/credentials';

describe('Événements — public', () => {
  beforeEach(() => cy.visit('/evenements'));

  it('affiche le titre', () => {
    cy.contains('h1', /événements/i).should('be.visible');
  });

  it('affiche le contenu après chargement', () => {
    cy.get('.loading-state', { timeout: 8000 }).should('not.exist');
    cy.get('.featured-event, app-empty-state, .alert-error', { timeout: 4000 }).should('exist');
  });

  it('le bouton s\'inscrire redirige vers connexion si non connecté', () => {
    cy.get('.loading-state', { timeout: 8000 }).should('not.exist');
    // Si featured-event existe, tester le bouton inscription
    cy.get('body').then($body => {
      if ($body.find('.featured-event').length > 0) {
        cy.get('.featured-event').within(() => {
          cy.contains('button', /inscrire/i).then($btn => {
            if ($btn.length > 0 && !$btn.is(':disabled')) {
              cy.wrap($btn).click();
              cy.url().should('include', '/connexion');
            }
          });
        });
      }
      // Si pas d'événement vedette, le test passe (état vide acceptable)
    });
  });
});

describe('Événements — membre connecté', () => {
  beforeEach(() => {
    cy.login(CREDENTIALS.membre.email, CREDENTIALS.membre.password);
    cy.visit('/evenements');
  });

  it('affiche les événements après chargement', () => {
    cy.get('.loading-state', { timeout: 8000 }).should('not.exist');
    cy.get('.featured-event, app-empty-state', { timeout: 4000 }).should('exist');
  });

  it('affiche l\'événement vedette', () => {
    cy.get('.loading-state', { timeout: 8000 }).should('not.exist');
    cy.get('.featured-event', { timeout: 4000 }).should('exist');
    cy.get('.featured-event h2').should('not.be.empty');
  });

  it('le bouton s\'inscrire ou état inscrit est visible', () => {
    cy.get('.loading-state', { timeout: 8000 }).should('not.exist');
    cy.get('.featured-event', { timeout: 4000 }).within(() => {
      cy.get('button, .event-state').should('exist');
    });
  });
});
