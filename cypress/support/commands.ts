Cypress.Commands.add('login', (email: string, password: string) => {
  cy.session([email, password], () => {
    cy.visit('/connexion');
    cy.get('input[type="email"], input[name="email"]').first().clear().type(email);
    cy.get('input[type="password"]').first().clear().type(password);

    cy.intercept('POST', '/api/utilisateurs/login').as('loginAttempt1');
    cy.get('button[type="submit"]').click();

    cy.wait('@loginAttempt1').then(interception => {
      if (interception.response?.statusCode === 429) {
        const retryAfter = Number(interception.response.headers['retry-after'] ?? 60);
        cy.wait((retryAfter + 2) * 1000);
        cy.intercept('POST', '/api/utilisateurs/login').as('loginAttempt2');
        cy.get('button[type="submit"]').click();
        cy.wait('@loginAttempt2');
      }
    });

    cy.url({ timeout: 15000 }).should('not.include', '/connexion');
  });
});

Cypress.Commands.add('logout', () => {
  cy.get('.uh-user__btn').click();
  cy.contains('button', /déconnecter|deconnecter/i).click();
  cy.url({ timeout: 5000 }).should('not.include', 'dashboard');
});

declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      logout(): Chainable<void>;
    }
  }
}

export {};
