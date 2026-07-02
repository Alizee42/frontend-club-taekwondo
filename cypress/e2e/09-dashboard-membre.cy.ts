import { CREDENTIALS } from '../support/credentials';

describe('Dashboard Membre', () => {
  beforeEach(() => {
    cy.login(CREDENTIALS.membre.email, CREDENTIALS.membre.password);
    cy.visit('/membre/dashboard-membre');
  });

  it('redirige vers le dashboard membre après connexion', () => {
    cy.url().should('include', '/membre/dashboard-membre');
  });

  it('affiche le header connecté avec le nom de l\'utilisateur', () => {
    cy.get('.uh-user__name').should('contain', 'Test');
  });

  it('affiche le bouton notifications dans le header', () => {
    cy.get('.uh-icon-btn[aria-label*="otification"]').should('exist');
  });

  it('ouvre le panel notifications', () => {
    cy.get('.uh-icon-btn[aria-label*="otification"]').click();
    cy.get('.uh-notif-panel.is-open').should('exist');
  });

  it('ferme le panel notifications avec le bouton fermer', () => {
    cy.get('.uh-icon-btn[aria-label*="otification"]').click();
    cy.get('.uh-notif-panel__close').click({ force: true });
    cy.get('.uh-notif-panel.is-open').should('not.exist');
  });

  it('le dashboard contient les sections attendues', () => {
    cy.get('[class*="dash"], [class*="dashboard"]').should('exist');
  });

  it('accès au profil depuis le menu utilisateur', () => {
    cy.get('.uh-user__btn').click();
    cy.contains('button, a', /profil/i).click({ force: true });
    cy.url().should('include', '/profil');
  });

  it('accès aux notifications depuis le panel', () => {
    cy.get('.uh-icon-btn[aria-label*="otification"]').click();
    cy.get('.uh-notif-panel__view-all').click({ force: true });
    cy.url().should('include', '/notifications');
  });
});

describe('Membre — Documents', () => {
  beforeEach(() => {
    cy.login(CREDENTIALS.membre.email, CREDENTIALS.membre.password);
    cy.visit('/membre/documents');
  });

  it('affiche la page documents membre', () => {
    cy.url().should('include', '/membre/documents');
    cy.get('h1, h2, [class*="doc"]', { timeout: 8000 }).should('exist');
  });

  it('affiche une liste ou état vide', () => {
    cy.get('[class*="list"], [class*="table"], app-empty-state, [class*="empty"], [class*="doc"]', { timeout: 8000 }).should('exist');
  });
});

describe('Membre — Paiements', () => {
  beforeEach(() => {
    cy.login(CREDENTIALS.membre.email, CREDENTIALS.membre.password);
    cy.visit('/membre/paiements');
  });

  it('affiche le tunnel de paiement en 3 étapes', () => {
    cy.url().should('include', '/membre/paiements');
    cy.get('.steps li').should('have.length', 3);
    cy.get('.steps li').eq(0).should('contain.text', 'Mode');
    cy.get('.steps li').eq(1).should('contain.text', 'Paiement');
    cy.get('.steps li').eq(2).should('contain.text', 'Confirmation');
  });

  it('affiche les deux modes de règlement', () => {
    cy.get('.mode-card').should('have.length', 2);
    cy.contains('.mode-title', 'En une fois').should('exist');
    cy.contains('.mode-title', 'En plusieurs fois').should('exist');
  });

  it('mode En une fois sélectionné par défaut', () => {
    cy.get('.mode-card.active').should('contain.text', 'En une fois');
  });

  it('sélectionner En plusieurs fois affiche les options', () => {
    cy.contains('.mode-card', 'En plusieurs fois').click();
    cy.get('.mode-card.active').should('contain.text', 'En plusieurs fois');
  });

  it('le bouton Continuer passe à l\'étape 2', () => {
    cy.contains('button', /continuer/i).click();
    cy.get('.step-title').should('contain.text', 'Récapitulatif');
    cy.get('.steps li').eq(1).should('have.class', 'active');
  });

  it('étape 2 affiche le récapitulatif avec le membre et le mode', () => {
    cy.contains('button', /continuer/i).click();
    cy.get('.rec-row').should('have.length.gte', 2);
    cy.contains('.k', 'Membre').should('exist');
    cy.contains('.k', 'Mode').should('exist');
  });

  it('étape 2 affiche le bouton Payer maintenant', () => {
    cy.contains('button', /continuer/i).click();
    cy.contains('button', /payer maintenant/i).should('exist').and('not.be.disabled');
  });

  it('étape 2 — Retour revient à l\'étape 1', () => {
    cy.contains('button', /continuer/i).click();
    cy.contains('button', /retour/i).click();
    cy.get('.step-title').should('contain.text', 'Mode');
  });

  it('cliquer Payer maintenant ouvre la modal Stripe', () => {
    cy.contains('button', /continuer/i).click();
    cy.contains('button', /payer maintenant/i).click();
    cy.get('ui-modal, .modal, [class*="modal"]', { timeout: 5000 }).should('exist');
    cy.contains(/paiement sécurisé/i).should('exist');
  });

  it('la modal Stripe peut être fermée avec Annuler', () => {
    cy.contains('button', /continuer/i).click();
    cy.contains('button', /payer maintenant/i).click();
    cy.contains('button', /annuler/i).click();
    cy.get('.step-title').should('contain.text', 'Récapitulatif');
  });

  it('affiche l\'historique des paiements ou état vide', () => {
    cy.get('#historique').should('exist');
    cy.get('.history-grid, .empty', { timeout: 8000 }).should('exist');
  });

  it('paiement complet avec stub Stripe (carte 4242)', () => {
    // Intercepter la clé publique Stripe → retourner une fausse clé pour débloquer l'init
    cy.intercept('GET', '/api/stripe/public-key', {
      statusCode: 200,
      body: { publicKey: 'pk_test_cypress_stub_key' }
    }).as('stripePublicKey');

    // Intercepter la création du paiement côté backend
    cy.intercept('POST', '/api/paiements/ajouter-membre', {
      statusCode: 201,
      body: { id: 9999, paiementId: 9999, type: 'UNIQUE', modePaiement: 'CB', montantTotal: 150, statut: 'EN_ATTENTE', echeances: [] }
    }).as('createPaiement');

    cy.intercept('POST', '/api/stripe/create-payment-intent', {
      statusCode: 200,
      body: { clientSecret: 'pi_test_fake_secret_test_fake', paymentIntentId: 'pi_test_fake' }
    }).as('createIntent');

    cy.intercept('POST', '/api/stripe/sync-payment', { statusCode: 200, body: {} }).as('syncPayment');

    // Stub window.Stripe avant le chargement de la page pour simuler Stripe.js
    cy.visit('/membre/paiements', {
      onBeforeLoad(win: any) {
        const cardElementStub = {
          mount: cy.stub().callsFake(() => {}),
          unmount: cy.stub(),
          on: cy.stub(),
        };
        const elementsStub = {
          create: cy.stub().returns(cardElementStub),
        };
        const stripeInstanceStub = {
          elements: cy.stub().returns(elementsStub),
          confirmCardPayment: cy.stub().resolves({
            paymentIntent: { status: 'succeeded', id: 'pi_test_fake' }
          }),
        };
        // Stripe.js est chargé via loadStripe() qui appelle window.Stripe
        win.Stripe = cy.stub().returns(stripeInstanceStub);
      }
    });

    // Étape 1 → Étape 2
    cy.contains('button', /continuer/i).click();
    cy.get('.step-title').should('contain.text', 'Récapitulatif');

    // Ouvrir modal Stripe
    cy.contains('button', /payer maintenant/i).click();
    cy.contains(/paiement sécurisé/i, { timeout: 6000 }).should('exist');

    // Le spinner disparaît une fois Stripe prêt (stub synchrone donc instantané)
    cy.get('.stripe-loading', { timeout: 8000 }).should('not.exist');

    // Confirmer le paiement
    cy.contains('button', /confirmer le paiement/i).should('not.be.disabled').click();

    // Étape 3 : confirmation
    cy.get('.confirm-title', { timeout: 15000 }).should('contain.text', 'Paiement confirmé');
    cy.get('.steps li').eq(2).should('have.class', 'active');
  });
});

describe('Membre — Commandes', () => {
  beforeEach(() => {
    cy.login(CREDENTIALS.membre.email, CREDENTIALS.membre.password);
    cy.visit('/membre/commandes');
  });

  it('affiche la page commandes membre', () => {
    cy.url().should('include', '/membre/commandes');
    cy.get('h1, h2, [class*="commande"], app-empty-state, [class*="empty"]', { timeout: 8000 }).should('exist');
  });
});

describe('Membre — Événements', () => {
  beforeEach(() => {
    cy.login(CREDENTIALS.membre.email, CREDENTIALS.membre.password);
    cy.visit('/membre/evenements');
  });

  it('affiche la page événements membre', () => {
    cy.url().should('include', '/membre/evenements');
    cy.get('h1, h2, [class*="event"], [class*="evenement"], app-empty-state', { timeout: 8000 }).should('exist');
  });

  it('affiche les événements ou état vide', () => {
    cy.get('.loading-state', { timeout: 8000 }).should('not.exist');
    cy.get('[class*="event"], [class*="evenement"], app-empty-state, [class*="empty"]', { timeout: 8000 }).should('exist');
  });
});

describe('Membre — Accès refusé aux zones admin', () => {
  beforeEach(() => {
    cy.login(CREDENTIALS.membre.email, CREDENTIALS.membre.password);
    cy.visit('/membre/dashboard-membre');
  });

  it('accès refusé à l\'admin dashboard', () => {
    cy.visit('/admin/dashboard-admin');
    cy.url().should('not.include', '/admin/dashboard-admin');
  });

  it('accès refusé au super-admin dashboard', () => {
    cy.visit('/super-admin/dashboard-super-admin');
    cy.url().should('not.include', '/super-admin/dashboard-super-admin');
  });
});
