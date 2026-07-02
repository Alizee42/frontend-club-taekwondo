describe('Accueil', () => {
  beforeEach(() => cy.visit('/'));

  it('affiche le header avec le logo', () => {
    cy.get('.uh-logo').should('be.visible');
    cy.contains('Olympique').should('be.visible');
  });

  it('affiche le lien connexion', () => {
    cy.contains('a', /connexion/i).should('be.visible');
  });

  it('navigation — tous les liens publics', () => {
    cy.contains('a', 'Accueil').should('be.visible');
    cy.contains('a', 'Boutique').should('be.visible');
    cy.contains('a', 'Événements').should('be.visible');
    cy.contains('a', 'Galerie').should('be.visible');
    cy.contains('a', 'Inscription').should('be.visible');
  });

  it('navigue vers la boutique', () => {
    cy.contains('a', 'Boutique').click();
    cy.url().should('include', '/boutique');
  });

  it('navigue vers les événements', () => {
    cy.contains('a', 'Événements').click();
    cy.url().should('include', '/evenements');
  });

  it('navigue vers la galerie', () => {
    cy.contains('a', 'Galerie').click();
    cy.url().should('include', '/galerie');
  });

  it('navigue vers inscription', () => {
    cy.contains('a', 'Inscription').click();
    cy.url().should('include', '/inscription');
  });

  it('navigue vers contact', () => {
    cy.contains('a', 'Contact').click();
    cy.url().should('include', '/contact');
  });

  it('le footer est présent', () => {
    cy.get('app-footer').scrollIntoView().should('be.visible');
  });

  it('mentions légales accessibles', () => {
    cy.visit('/mentions-legales');
    cy.url().should('include', '/mentions-legales');
    cy.get('h1, h2').should('exist');
  });

  it('politique de confidentialité accessible', () => {
    cy.visit('/politique-confidentialite');
    cy.url().should('include', '/politique-confidentialite');
    cy.get('h1, h2').should('exist');
  });
});
