import { CREDENTIALS } from '../support/credentials';

describe('Profil — membre', () => {
  beforeEach(() => {
    cy.login(CREDENTIALS.membre.email, CREDENTIALS.membre.password);
    cy.visit('/profil');
    cy.get('.profil-panel', { timeout: 8000 }).should('exist');
  });

  it('affiche les informations du profil', () => {
    cy.get('h2').should('contain.text', 'Informations personnelles');
    cy.get('input[id="nom"]').should('have.value', 'Membre');
    cy.get('input[id="prenom"]').should('have.value', 'Test');
  });

  it('les champs sont désactivés par défaut', () => {
    cy.get('input[id="nom"]').should('be.disabled');
    cy.get('input[id="prenom"]').should('be.disabled');
  });

  it('le bouton Modifier active le mode édition', () => {
    cy.contains('button', /modifier/i).first().click();
    cy.get('input[id="nom"]').should('not.be.disabled');
    cy.get('input[id="prenom"]').should('not.be.disabled');
  });

  it('le bouton Annuler désactive les champs', () => {
    cy.contains('button', /modifier/i).first().click();
    cy.get('input[id="nom"]').should('not.be.disabled');
    cy.contains('button', /annuler/i).click();
    cy.get('input[id="nom"]').should('be.disabled');
  });

  it('affiche les onglets Informations et Sécurité', () => {
    cy.get('.profil-nav__item').should('have.length', 2);
    cy.contains('.profil-nav__item', /informations/i).should('exist');
    cy.contains('.profil-nav__item', /sécurité/i).should('exist');
  });

  it('onglet Sécurité affiche le bloc mot de passe', () => {
    cy.contains('.profil-nav__item', /sécurité/i).click();
    cy.get('.security-item').should('exist');
    cy.get('h2').should('contain.text', 'Sécurité');
  });

  it('le modal changement de mot de passe s\'ouvre', () => {
    cy.contains('.profil-nav__item', /sécurité/i).click();
    cy.contains('button', /modifier/i).click();
    cy.get('.modal', { timeout: 3000 }).should('be.visible');
    cy.get('input[type="password"]').should('have.length.gte', 2);
  });

  it('le modal se ferme avec Annuler', () => {
    cy.contains('.profil-nav__item', /sécurité/i).click();
    cy.contains('button', /modifier/i).click();
    cy.get('.modal').should('be.visible');
    cy.contains('button', /annuler/i).click();
    cy.get('.modal').should('not.exist');
  });

  it('l\'indicateur de force apparaît dans le modal', () => {
    cy.contains('.profil-nav__item', /sécurité/i).click();
    cy.contains('button', /modifier/i).click();
    cy.get('input[id="newPassword"]').type('abc');
    cy.get('.pwd-strength-bar', { timeout: 3000 }).should('be.visible');
  });
});
