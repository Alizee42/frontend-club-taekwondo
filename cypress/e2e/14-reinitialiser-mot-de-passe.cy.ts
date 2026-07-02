// ══════════════════════════════════════════════════════════
// PAGE RÉINITIALISER MOT DE PASSE
// ══════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────
// ÉTAT SANS TOKEN (accès direct sans lien email)
// ──────────────────────────────────────────────────────────
describe('Réinitialiser MDP — Sans token', () => {
  beforeEach(() => cy.visit('/reinitialiser-mot-de-passe'));

  it('affiche la page sans erreur 500', () => {
    cy.url().should('include', '/reinitialiser-mot-de-passe');
  });

  it('affiche un message d\'erreur token manquant', () => {
    cy.contains(/token manquant|lien.*email|sans lien valide/i, { timeout: 6000 }).should('exist');
  });

  it('affiche le bouton retour vers connexion', () => {
    cy.contains('button', /retour.*connexion|connexion/i, { timeout: 6000 }).should('exist');
  });

  it('le bouton retour redirige vers /connexion', () => {
    cy.contains('button', /retour.*connexion|connexion/i, { timeout: 6000 }).click();
    cy.url().should('include', '/connexion');
  });

  it('affiche le bouton demander un nouveau lien', () => {
    cy.contains('button', /nouveau lien|demander/i, { timeout: 6000 }).should('exist');
  });

  it('le bouton nouveau lien redirige vers /mot-de-passe-oublie', () => {
    cy.contains('button', /nouveau lien|demander/i, { timeout: 6000 }).click();
    cy.url().should('include', '/mot-de-passe-oublie');
  });
});

// ──────────────────────────────────────────────────────────
// ÉTAT TOKEN INVALIDE (API retourne une erreur)
// ──────────────────────────────────────────────────────────
describe('Réinitialiser MDP — Token invalide', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/reinitialisation/verifier*', {
      statusCode: 400,
      body: { message: 'Token invalide ou expiré.' }
    }).as('verifyToken');
    cy.visit('/reinitialiser-mot-de-passe?token=token-invalide');
    cy.wait('@verifyToken');
  });

  it('affiche un message d\'erreur token invalide', () => {
    cy.contains(/invalide|expiré|lien.*valide/i, { timeout: 6000 }).should('exist');
  });

  it('affiche le bouton demander un nouveau lien', () => {
    cy.contains('button', /nouveau lien|demander/i, { timeout: 6000 }).should('exist');
  });

  it('affiche le bouton retour vers connexion', () => {
    cy.contains('button', /retour.*connexion|connexion/i, { timeout: 6000 }).should('exist');
  });

  it('ne montre pas le formulaire de mot de passe', () => {
    cy.get('#password', { timeout: 3000 }).should('not.exist');
  });
});

// ──────────────────────────────────────────────────────────
// ÉTAT TOKEN VALIDE — Formulaire
// ──────────────────────────────────────────────────────────
describe('Réinitialiser MDP — Formulaire (token valide)', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/reinitialisation/verifier*', {
      statusCode: 200,
      body: {}
    }).as('verifyToken');
    cy.visit('/reinitialiser-mot-de-passe?token=token-valide-test');
    cy.wait('@verifyToken');
    cy.get('#password', { timeout: 6000 }).should('exist');
  });

  it('affiche le champ nouveau mot de passe', () => {
    cy.get('#password').should('exist');
  });

  it('affiche le champ confirmation mot de passe', () => {
    cy.get('#confirmPassword').should('exist');
  });

  it('affiche le bouton Réinitialiser le mot de passe', () => {
    cy.contains('button', /réinitialiser le mot de passe/i).should('exist');
  });

  it('le bouton submit est désactivé si les champs sont vides', () => {
    cy.get('button[type="submit"]').should('be.disabled');
  });

  it('affiche l\'indicateur de force après saisie du mot de passe', () => {
    cy.get('#password').type('abc');
    cy.get('.strength-meter', { timeout: 3000 }).should('exist');
  });

  it('affiche la barre de force', () => {
    cy.get('#password').type('abc');
    cy.get('.strength-bar', { timeout: 3000 }).should('exist');
  });

  it('affiche le texte de force du mot de passe', () => {
    cy.get('#password').type('abc');
    cy.get('.strength-text', { timeout: 3000 }).should('exist');
  });

  it('affiche les exigences du mot de passe', () => {
    cy.get('#password').type('a');
    cy.get('.password-requirements', { timeout: 3000 }).should('exist');
  });

  it('affiche l\'exigence longueur minimum', () => {
    cy.get('#password').type('a');
    cy.contains(/8 caractères|longueur/i, { timeout: 3000 }).should('exist');
  });

  it('affiche l\'exigence majuscule', () => {
    cy.get('#password').type('a');
    cy.contains(/majuscule/i, { timeout: 3000 }).should('exist');
  });

  it('affiche l\'exigence chiffre', () => {
    cy.get('#password').type('a');
    cy.contains(/chiffre/i, { timeout: 3000 }).should('exist');
  });

  it('le bouton bascule affiche/cache le mot de passe', () => {
    cy.get('#password').type('MonMotDePasse1!');
    cy.get('.toggle-password').first().click();
    cy.get('input[name="password"]').should('have.attr', 'type', 'text');
    cy.get('.toggle-password').first().click();
    cy.get('input[name="password"]').should('have.attr', 'type', 'password');
  });

  it('erreur si mots de passe différents', () => {
    cy.get('#password').type('MonMotDePasse1!');
    cy.get('#confirmPassword').type('AutreMdp1!');
    cy.get('button[type="submit"]').click();
    cy.contains(/ne correspondent pas/i, { timeout: 4000 }).should('exist');
  });

  it('erreur si mot de passe trop faible', () => {
    cy.get('#password').type('motdepasse');
    cy.get('#confirmPassword').type('motdepasse');
    cy.get('button[type="submit"]').click();
    cy.contains(/8 caractères|majuscule|spécial|fort/i, { timeout: 4000 }).should('exist');
  });
});

// ──────────────────────────────────────────────────────────
// SOUMISSION RÉUSSIE
// ──────────────────────────────────────────────────────────
describe('Réinitialiser MDP — Succès', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/reinitialisation/verifier*', {
      statusCode: 200,
      body: {}
    }).as('verifyToken');
    cy.intercept('POST', '/api/reinitialisation/reinitialiser-mot-de-passe*', {
      statusCode: 200,
      body: { message: 'Mot de passe réinitialisé avec succès.' }
    }).as('resetPassword');
    cy.visit('/reinitialiser-mot-de-passe?token=token-valide-test');
    cy.wait('@verifyToken');
    cy.get('#password', { timeout: 6000 }).should('exist');
  });

  it('soumettre un mot de passe valide appelle l\'API', () => {
    cy.get('#password').type('MonMotDePasse1!');
    cy.get('#confirmPassword').type('MonMotDePasse1!');
    cy.get('button[type="submit"]').click();
    cy.wait('@resetPassword');
  });

  it('affiche le message de succès après réinitialisation', () => {
    cy.get('#password').type('MonMotDePasse1!');
    cy.get('#confirmPassword').type('MonMotDePasse1!');
    cy.get('button[type="submit"]').click();
    cy.wait('@resetPassword');
    cy.contains(/succès|réinitialisé|mis à jour/i, { timeout: 5000 }).should('exist');
  });

  it('affiche le bouton Se connecter après succès', () => {
    cy.get('#password').type('MonMotDePasse1!');
    cy.get('#confirmPassword').type('MonMotDePasse1!');
    cy.get('button[type="submit"]').click();
    cy.wait('@resetPassword');
    cy.contains('button', /se connecter/i, { timeout: 5000 }).should('exist');
  });

  it('le bouton Se connecter redirige vers /connexion', () => {
    cy.get('#password').type('MonMotDePasse1!');
    cy.get('#confirmPassword').type('MonMotDePasse1!');
    cy.get('button[type="submit"]').click();
    cy.wait('@resetPassword');
    cy.contains('button', /se connecter/i, { timeout: 5000 }).click();
    cy.url().should('include', '/connexion');
  });
});

// ──────────────────────────────────────────────────────────
// ERREUR API lors de la soumission
// ──────────────────────────────────────────────────────────
describe('Réinitialiser MDP — Erreur API soumission', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/reinitialisation/verifier*', {
      statusCode: 200,
      body: {}
    }).as('verifyToken');
    cy.intercept('POST', '/api/reinitialisation/reinitialiser-mot-de-passe*', {
      statusCode: 400,
      body: { message: 'Token expiré.' }
    }).as('resetError');
    cy.visit('/reinitialiser-mot-de-passe?token=token-valide-test');
    cy.wait('@verifyToken');
    cy.get('#password', { timeout: 6000 }).should('exist');
  });

  it('affiche l\'erreur retournée par l\'API', () => {
    cy.get('#password').type('MonMotDePasse1!');
    cy.get('#confirmPassword').type('MonMotDePasse1!');
    cy.get('button[type="submit"]').click();
    cy.wait('@resetError');
    cy.contains(/expiré|erreur/i, { timeout: 5000 }).should('exist');
  });
});
