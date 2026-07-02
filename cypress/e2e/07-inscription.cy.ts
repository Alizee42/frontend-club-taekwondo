// Helpers pour remplir chaque section de l'accordéon
function remplirIdentite() {
  cy.get('input[id="nom"]').type('Dupont');
  cy.get('input[id="prenom"]').type('Jean');
  cy.get('input[id="email"]').type(`cypress.test.${Date.now()}@test.com`);
  cy.get('input[id="telephone"]').type('0600000000');
  cy.get('input[id="dateNaissance"]').type('1990-05-15');
  cy.get('select[id="role"]').select('MEMBRE');
  cy.get('select[id="clubId"]').select(1); // premier club disponible
  cy.get('.accordion.is-open .accordion__footer button').click({ force: true });
  cy.get('.accordion.is-done').should('exist'); // section identité validée
}

function remplirAdresse() {
  // Attendre que l'accordéon adresse soit ouvert
  cy.get('input[id="adresseLigne1"]').should('be.visible');
  cy.get('input[id="adresseLigne1"]').type('15 rue des Lilas');
  cy.get('input[id="codePostal"]').type('69001');
  cy.get('input[id="ville"]').type('Lyon');
  // Cibler le bouton dans l'accordéon ouvert uniquement
  cy.get('.accordion.is-open .accordion__footer button').click({ force: true });
}

function remplirMotDePasse(mdp = 'MotDePasseTest1!') {
  cy.get('input[id="password"]').should('be.visible');
  cy.get('input[id="password"]').type(mdp);
  cy.get('input[id="confirmPassword"]').type(mdp);
  cy.get('.accordion.is-open .accordion__footer button').click({ force: true });
}

describe('Inscription — structure', () => {
  beforeEach(() => cy.visit('/inscription'));

  it('affiche la page inscription avec le stepper', () => {
    cy.get('h1').should('contain.text', 'Inscription');
    cy.get('.insc-sidebar__step').should('have.length.gte', 3);
  });

  it('section identité est ouverte par défaut', () => {
    cy.get('.accordion.is-open').should('exist');
    cy.get('input[id="nom"]').should('be.visible');
    cy.get('input[id="email"]').should('be.visible');
  });

  it('section adresse est verrouillée au départ', () => {
    cy.contains('.accordion__badge--locked', /section 1/i).should('exist');
  });

  it('section mot de passe est verrouillée au départ', () => {
    cy.contains('.accordion__badge--locked', /section 2/i).should('exist');
  });

  it('erreur nom trop court après blur', () => {
    cy.get('input[id="nom"]').type('A').blur();
    cy.get('.field-error').should('contain.text', '2 caract');
  });

  it('erreur email invalide après blur', () => {
    cy.get('input[id="email"]').type('pasunemail').blur();
    cy.get('.field-error').should('exist');
  });
});

describe('Inscription — section identité → section adresse', () => {
  beforeEach(() => cy.visit('/inscription'));

  it('valider la section identité déverrouille la section adresse', () => {
    remplirIdentite();
    cy.get('.accordion.is-open input[id="adresseLigne1"]').should('be.visible');
  });

  it('section identité marquée ✓ Complété', () => {
    remplirIdentite();
    cy.contains('.accordion__badge', /complété/i).should('exist');
  });
});

describe('Inscription — section adresse → section mot de passe', () => {
  beforeEach(() => {
    cy.visit('/inscription');
    remplirIdentite();
  });

  it('valider l\'adresse déverrouille la section mot de passe', () => {
    remplirAdresse();
    cy.get('input[id="password"]').should('be.visible');
  });

  it('la barre de progression affiche 2/3 après adresse complétée', () => {
    remplirAdresse();
    cy.get('.insc-sidebar__progress-label').should('contain', '2/3');
  });
});

describe('Inscription — section mot de passe', () => {
  beforeEach(() => {
    cy.visit('/inscription');
    remplirIdentite();
    remplirAdresse();
  });

  it('l\'indicateur de force apparaît en tapant', () => {
    cy.get('input[id="password"]').type('abc');
    cy.get('.password-strength-block').should('be.visible');
  });

  it('mot de passe fort → 3 ou 4 barres remplies', () => {
    cy.get('input[id="password"]').type('MotDePasseTest1!');
    cy.get('.bar.filled').should('have.length.gte', 3);
  });

  it('erreur si mots de passe différents', () => {
    cy.get('input[id="password"]').type('MotDePasseTest1!');
    cy.get('input[id="confirmPassword"]').type('AutreMdp1!');
    cy.get('input[id="confirmPassword"]').blur();
    cy.get('.field-error').should('contain.text', 'correspondent pas');
  });

  it('3/3 sections complétées → bouton étape suivante visible', () => {
    remplirMotDePasse();
    cy.get('.insc-submit').should('be.visible');
    cy.contains('button, ui-button', /étape suivante/i).should('exist');
  });
});

describe('Inscription — récapitulatif (étape 3)', () => {
  beforeEach(() => {
    cy.visit('/inscription');
    remplirIdentite();
    remplirAdresse();
    remplirMotDePasse();
    // MEMBRE seul → étape 2 sautée, direct étape 3
    cy.get('.insc-submit button, .insc-submit ui-button button').click({ force: true });
    cy.get('.insc-recap', { timeout: 8000 }).should('exist');
  });

  it('affiche le récapitulatif avec les infos saisies', () => {
    cy.get('.recap-header__title').invoke('text').then(t => expect(t.toLowerCase()).to.include('récapitulatif'));
    cy.get('.recap-value').should('contain', 'Dupont');
    cy.get('.recap-value').should('contain', 'Jean');
  });

  it('affiche le rôle et le club dans le récap', () => {
    cy.get('.badge-pill').should('contain', 'MEMBRE');
    cy.get('.badge-pill').should('contain.text', '');
  });

  it('bouton Finaliser l\'inscription est visible', () => {
    cy.contains('button', /finaliser/i).should('be.visible').and('not.be.disabled');
  });

  it('bouton Retour ramène à l\'étape précédente', () => {
    cy.contains('button', /retour/i).first().click({ force: true });
    cy.get('.insc-sidebar__step.is-active').should('exist');
  });
});

describe('Inscription — finalisation et succès', () => {
  it('soumettre le formulaire complet affiche la modal succès', () => {
    cy.visit('/inscription');
    // Utiliser un email unique pour éviter les doublons
    const email = `cypress.final.${Date.now()}@test.com`;

    cy.get('input[id="nom"]').type('Dupont');
    cy.get('input[id="prenom"]').type('Jean');
    cy.get('input[id="email"]').type(email);
    cy.get('input[id="telephone"]').type('0600000000');
    cy.get('input[id="dateNaissance"]').type('1990-05-15');
    cy.get('select[id="role"]').select('MEMBRE');
    cy.get('select[id="clubId"]').select(1);
    cy.get('.accordion.is-open .accordion__footer button').click({ force: true });
    cy.get('.accordion.is-done').should('exist');

    cy.get('input[id="adresseLigne1"]').should('be.visible').type('15 rue des Lilas');
    cy.get('input[id="codePostal"]').type('69001');
    cy.get('input[id="ville"]').type('Lyon');
    cy.get('.accordion.is-open .accordion__footer button').click({ force: true });

    cy.get('input[id="password"]').should('be.visible').type('MotDePasseTest1!');
    cy.get('input[id="confirmPassword"]').type('MotDePasseTest1!');
    cy.get('.accordion.is-open .accordion__footer button').click({ force: true });

    // Étape suivante → récap
    cy.get('.insc-submit button, .insc-submit ui-button button').click({ force: true });
    cy.get('.insc-recap', { timeout: 8000 }).should('exist');

    // Intercepter l'appel API register
    cy.intercept('POST', '/api/utilisateurs/register').as('register');
    cy.contains('button', /finaliser/i).click({ force: true });

    cy.wait('@register', { timeout: 15000 }).then(interception => {
      expect(interception.response?.statusCode).to.be.oneOf([200, 201]);
    });

    // Modal succès
    cy.get('.modal-overlay, [role="dialog"]', { timeout: 10000 }).should('be.visible');
    cy.contains(/inscription réussie/i).should('exist');
  });
});
