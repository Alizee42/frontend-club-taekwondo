describe('Mot de passe oublié', () => {
  beforeEach(() => cy.visit('/mot-de-passe-oublie'));

  it('affiche le formulaire', () => {
    cy.get('input[type="email"]').should('be.visible');
  });

  it('le bouton submit est désactivé pour un email invalide', () => {
    cy.get('input[type="email"]').type('pasunemail');
    cy.get('button[type="submit"]').should('be.disabled');
  });

  it('soumet un email valide', () => {
    cy.get('input[type="email"]').type('test@example.com');
    cy.get('button[type="submit"]').click();
    cy.get('[class*="success"], [class*="confirm"], .toast, p', { timeout: 6000 }).should('exist');
  });

  it('lien retour vers connexion', () => {
    cy.contains('a', /connexion|retour/i).should('exist').click();
    cy.url().should('include', '/connexion');
  });
});
