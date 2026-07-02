import { CREDENTIALS } from '../support/credentials';

describe('Connexion', () => {
  beforeEach(() => cy.visit('/connexion'));

  it('affiche le formulaire', () => {
    cy.get('input[type="email"]').should('be.visible');
    cy.get('input[type="password"]').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible');
  });

  it('bouton submit désactivé si champs vides', () => {
    cy.get('button[type="submit"]').should('be.disabled');
  });

  it('erreur avec identifiants invalides', () => {
    cy.get('input[type="email"]').type('inconnu@test.com');
    cy.get('input[type="password"]').type('mauvaismdp123');
    cy.get('button[type="submit"]').click();
    cy.get('.toast, [class*="error"], [class*="danger"], [class*="alert"]', { timeout: 6000 }).should('exist');
  });

  it('lien mot de passe oublié', () => {
    cy.contains('a', /mot de passe|oublié/i).should('exist').click();
    cy.url().should('include', '/mot-de-passe-oublie');
  });

  it('lien vers inscription', () => {
    cy.contains('a', /inscription|inscrire/i).should('exist');
  });

  it('connexion ADMIN → dashboard admin', () => {
    cy.login(CREDENTIALS.admin.email, CREDENTIALS.admin.password);
    cy.url().should('include', '/admin/dashboard-admin');
  });

  it('connexion MEMBRE → dashboard membre', () => {
    cy.login(CREDENTIALS.membre.email, CREDENTIALS.membre.password);
    cy.url().should('include', '/membre/dashboard-membre');
  });

  it('connexion PARENT → dashboard parent', () => {
    cy.login(CREDENTIALS.parent.email, CREDENTIALS.parent.password);
    cy.url().should('include', '/parent/dashboard-parent');
  });

  it('connexion SUPER_ADMIN → dashboard super admin', () => {
    cy.login(CREDENTIALS.superAdmin.email, CREDENTIALS.superAdmin.password);
    cy.url().should('include', '/super-admin/dashboard-super-admin');
  });

  it('déconnexion redirige vers accueil', () => {
    cy.login(CREDENTIALS.membre.email, CREDENTIALS.membre.password);
    cy.logout();
    cy.url().should('eq', Cypress.config().baseUrl + '/');
  });
});
