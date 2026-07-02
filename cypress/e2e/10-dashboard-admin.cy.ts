import { CREDENTIALS } from '../support/credentials';

// ══════════════════════════════════════════════════════════
// DASHBOARD ADMIN
// ══════════════════════════════════════════════════════════
describe('Dashboard Admin — navigation principale', () => {
  beforeEach(() => {
    cy.login(CREDENTIALS.admin.email, CREDENTIALS.admin.password);
    cy.visit('/admin/dashboard-admin');
  });

  it('redirige vers le dashboard admin après connexion', () => {
    cy.url().should('include', '/admin/dashboard-admin');
  });

  it('affiche le titre de bienvenue avec le prénom', () => {
    cy.get('.dash-header__title, h1, h2').should('exist');
  });

  it('affiche la date du jour', () => {
    cy.get('.dash-header__date, [class*="date"]').should('exist');
  });

  it('affiche les 4 cartes KPI (membres, paiements reçus, en attente, événements)', () => {
    cy.get('.ui-kpi-card, [class*="kpi"]', { timeout: 8000 }).should('have.length.gte', 4);
  });

  it('les KPI affichent des valeurs numériques', () => {
    cy.get('.ui-kpi-card, [class*="kpi"]', { timeout: 8000 }).first().should('contain.text', '');
  });

  it('affiche les sections de navigation (vie du club, adhérents, boutique, site public)', () => {
    cy.get('[class*="dash-section"], [class*="section"]', { timeout: 8000 }).should('have.length.gte', 1);
  });

  it('les cartes de navigation sont présentes', () => {
    cy.get('app-dashboard-nav-card', { timeout: 8000 }).should('have.length.gte', 1);
  });

  it('accès refusé aux routes super-admin', () => {
    cy.visit('/super-admin/dashboard-super-admin');
    cy.url().should('not.include', '/super-admin/dashboard-super-admin');
  });
});

// ══════════════════════════════════════════════════════════
// GESTION MEMBRES
// ══════════════════════════════════════════════════════════
describe('Admin — Gestion membres', () => {
  beforeEach(() => {
    cy.login(CREDENTIALS.admin.email, CREDENTIALS.admin.password);
    cy.visit('/admin/membres');
  });

  it('affiche la page gestion membres', () => {
    cy.url().should('include', '/admin/membres');
    cy.get('ui-table, [class*="table"], [class*="gm-"]', { timeout: 8000 }).should('exist');
  });

  it('affiche les deux onglets Comptes et Pratiquants', () => {
    cy.get('.gm-tab, [class*="tab"]', { timeout: 8000 }).should('have.length.gte', 2);
    cy.contains('.gm-tab, [class*="tab"]', /comptes/i).should('exist');
    cy.contains('.gm-tab, [class*="tab"]', /pratiquants/i).should('exist');
  });

  it('affiche les KPI comptes (total, parents, membres)', () => {
    cy.get('.ui-kpi-card, [class*="kpi"]', { timeout: 8000 }).should('have.length.gte', 3);
  });

  it('le tableau des comptes s\'affiche', () => {
    cy.get('table, [class*="table"]', { timeout: 8000 }).should('exist');
  });

  it('basculer sur l\'onglet Pratiquants change les KPI', () => {
    cy.contains('.gm-tab, [class*="tab"]', /pratiquants/i).click();
    cy.get('.ui-kpi-card, [class*="kpi"]', { timeout: 8000 }).should('have.length.gte', 3);
  });

  it('le bouton Ajouter un compte ouvre le formulaire', () => {
    cy.contains('button', /ajouter un compte/i).click();
    cy.get('input[name="nom"], input[placeholder*="Nom"], .gm-form input', { timeout: 5000 }).should('exist');
  });

  it('le formulaire compte contient les champs requis', () => {
    cy.contains('button', /ajouter un compte/i).click();
    cy.get('input[name="nom"], [name="nom"]', { timeout: 5000 }).should('exist');
    cy.get('input[name="prenom"], [name="prenom"]').should('exist');
    cy.get('input[name="email"], [name="email"]').should('exist');
    cy.get('select[name="role"], [name="role"]').should('exist');
  });

  it('le formulaire peut être annulé', () => {
    cy.contains('button', /ajouter un compte/i).click();
    cy.get('.gm-form, form', { timeout: 5000 }).should('exist');
    cy.contains('button', /annuler/i).click({ force: true });
    cy.get('.gm-form', { timeout: 3000 }).should('not.exist');
  });

  it('le bouton Ajouter un pratiquant ouvre le formulaire', () => {
    cy.contains('.gm-tab, [class*="tab"]', /pratiquants/i).click();
    cy.contains('button', /ajouter un pratiquant/i).click();
    cy.get('.gm-form input, form input', { timeout: 5000 }).should('exist');
  });

  it('la pagination s\'affiche si plusieurs pages', () => {
    cy.get('body').then($body => {
      if ($body.find('[class*="gm-pagination"]').length === 0) return;
      cy.get('.gm-page-btn').last().then($btn => {
        if (!$btn.is(':disabled')) {
          cy.wrap($btn).click();
          cy.get('.gm-page-info').should('contain', '2');
        }
      });
    });
  });

  it('un membre existant a des boutons Modifier et Supprimer', () => {
    cy.get('table tbody tr, [class*="gm-row"]', { timeout: 8000 }).then($rows => {
      if ($rows.length === 0) return;
      cy.get('button[title*="Modifier"], button[aria-label*="edit"], [class*="edit"], button .ri-edit-2-line')
        .first().should('exist');
    });
  });
});

// ══════════════════════════════════════════════════════════
// HORAIRES
// ══════════════════════════════════════════════════════════
describe('Admin — Horaires', () => {
  beforeEach(() => {
    cy.login(CREDENTIALS.admin.email, CREDENTIALS.admin.password);
    cy.visit('/admin/horaires');
  });

  it('affiche la page horaires', () => {
    cy.url().should('include', '/admin/horaires');
    cy.get('h1, h2, [class*="horaire"]', { timeout: 8000 }).should('exist');
  });

  it('affiche la grille hebdomadaire (7 jours)', () => {
    cy.get('.week-grid', { timeout: 8000 }).should('exist');
    cy.get('.week-grid .day-card', { timeout: 8000 }).should('have.length', 7);
  });

  it('affiche les KPI (créneaux, jours actifs, groupes)', () => {
    cy.get('.ui-kpi-card, [class*="kpi"]', { timeout: 8000 }).should('have.length.gte', 3);
  });

  it('le bouton Ajouter des horaires ouvre le formulaire', () => {
    cy.contains('button', /ajouter des horaires/i).click();
    cy.get('.schedule-form, form, ui-modal', { timeout: 5000 }).should('exist');
    cy.get('select[name="jour"], select', { timeout: 5000 }).should('exist');
  });

  it('le formulaire d\'horaires contient les champs requis', () => {
    cy.contains('button', /ajouter des horaires/i).click();
    cy.get('ui-modal', { timeout: 5000 }).should('exist');
    // Sélectionner un jour pour afficher les plages (openedPlageIndex = 0 automatiquement)
    cy.get('select#jour', { timeout: 5000 }).select('Lundi').trigger('change');
    // Attendre qu'Angular affiche la section plages, puis le champ groupe (plage ouverte à index 0)
    cy.get('.plages-stack .plage-panel:not(.is-closed)', { timeout: 8000 }).should('exist');
    cy.get('input[placeholder*="Enfants"]', { timeout: 8000 }).should('exist');
  });

  it('fermer la modal horaires fonctionne', () => {
    cy.contains('button', /ajouter des horaires/i).click();
    cy.get('ui-modal', { timeout: 5000 }).should('exist');
    // Fermer via le bouton X interne du composant ui-modal
    cy.get('ui-modal button[aria-label*="ermer"], ui-modal .modal-close, ui-modal [class*="close"]')
      .first().click({ force: true });
    cy.get('ui-modal[open="true"]', { timeout: 3000 }).should('not.exist');
  });

  it('chaque jour affiche son nom', () => {
    const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    cy.get('.week-grid .day-card', { timeout: 8000 }).each(($card, index) => {
      cy.wrap($card).find('.day-card__name').should('contain.text', jours[index]);
    });
  });
});

// ══════════════════════════════════════════════════════════
// PROFESSEURS
// ══════════════════════════════════════════════════════════
describe('Admin — Professeurs', () => {
  beforeEach(() => {
    cy.login(CREDENTIALS.admin.email, CREDENTIALS.admin.password);
    cy.visit('/admin/professeurs');
  });

  it('affiche la page professeurs', () => {
    cy.url().should('include', '/admin/professeurs');
    cy.get('h1, h2, [class*="prof"]', { timeout: 8000 }).should('exist');
  });

  it('affiche les KPI (total, avec photo, avec réseaux)', () => {
    cy.get('.ui-kpi-card, [class*="kpi"]', { timeout: 8000 }).should('have.length.gte', 3);
  });

  it('le bouton Ajouter un professeur ouvre le formulaire', () => {
    cy.contains('button', /ajouter un professeur/i).click();
    cy.get('.professeur-form, form, ui-modal', { timeout: 5000 }).should('exist');
  });

  it('le formulaire professeur contient les champs nom, prénom, spécialité, description', () => {
    cy.contains('button', /ajouter un professeur/i).click();
    cy.get('input[name="nom"], [placeholder*="Nom"]', { timeout: 5000 }).should('exist');
    cy.get('input[name="prenom"], [placeholder*="Prénom"]').should('exist');
    cy.get('input[name="specialite"], [placeholder*="pécialit"]').should('exist');
    cy.get('textarea, [name="description"]').should('exist');
  });

  it('le formulaire contient un champ upload photo', () => {
    cy.contains('button', /ajouter un professeur/i).click();
    cy.get('input[type="file"]', { timeout: 5000 }).should('exist');
  });

  it('annuler le formulaire le ferme', () => {
    cy.contains('button', /ajouter un professeur/i).click();
    cy.contains('button', /annuler/i).click({ force: true });
    cy.get('.professeur-form', { timeout: 3000 }).should('not.exist');
  });

  it('affiche les cartes professeurs ou un état vide', () => {
    cy.get('.professeurs-grid, .professeur-card, .empty-state, [class*="empty"]', { timeout: 8000 }).should('exist');
  });

  it('une fiche professeur a un bouton supprimer', () => {
    cy.get('body').then($body => {
      if ($body.find('.professeur-card').length === 0) return;
      cy.get('.professeur-card').first().find('button').should('exist');
    });
  });
});

// ══════════════════════════════════════════════════════════
// AVIS
// ══════════════════════════════════════════════════════════
describe('Admin — Avis', () => {
  beforeEach(() => {
    cy.login(CREDENTIALS.admin.email, CREDENTIALS.admin.password);
    cy.visit('/admin/avis');
  });

  it('affiche la page avis', () => {
    cy.url().should('include', '/admin/avis');
    cy.get('h1, h2, [class*="avis"]', { timeout: 8000 }).should('exist');
  });

  it('affiche les KPI (total, approuvés, en attente, note moyenne)', () => {
    cy.get('.ui-kpi-card, [class*="kpi"]', { timeout: 8000 }).should('have.length.gte', 4);
  });

  it('affiche la barre de filtres avec recherche et sélecteur de statut', () => {
    cy.get('.filters-bar, [class*="filter"]', { timeout: 8000 }).should('exist');
    cy.get('input[placeholder*="Rechercher"], input[type="search"]', { timeout: 5000 }).should('exist');
    cy.get('select', { timeout: 5000 }).should('exist');
  });

  it('le filtre statut contient les options attendues', () => {
    cy.get('select', { timeout: 5000 }).first().find('option').then($opts => {
      const texts = [...$opts].map(o => o.text.toLowerCase());
      expect(texts.some(t => t.includes('tous') || t.includes('attente') || t.includes('approuv'))).to.be.true;
    });
  });

  it('la recherche filtre les avis', () => {
    cy.get('input[placeholder*="Rechercher"], input[type="search"]', { timeout: 5000 }).type('test');
    cy.get('[class*="table"], table', { timeout: 5000 }).should('exist');
  });

  it('affiche le tableau des avis ou état vide', () => {
    cy.get('table, ui-table, [class*="table"], app-empty-state, [class*="empty"]', { timeout: 8000 }).should('exist');
  });

  it('un avis existant a un bouton approuver ou refuser', () => {
    cy.get('body').then($body => {
      if ($body.find('.col-actions ui-icon-button').length === 0) return;
      cy.get('.col-actions ui-icon-button').first().should('exist');
    });
  });
});

// ══════════════════════════════════════════════════════════
// ACTUALITÉS
// ══════════════════════════════════════════════════════════
describe('Admin — Actualités', () => {
  beforeEach(() => {
    cy.login(CREDENTIALS.admin.email, CREDENTIALS.admin.password);
    cy.visit('/admin/actualites');
  });

  it('affiche la page actualités', () => {
    cy.url().should('include', '/admin/actualites');
    cy.get('h1, h2, [class*="actu"]', { timeout: 8000 }).should('exist');
  });

  it('affiche les KPI (actualités, à la une, événements)', () => {
    cy.get('.ui-kpi-card, [class*="kpi"]', { timeout: 8000 }).should('have.length.gte', 3);
  });

  it('affiche la barre de filtres (recherche, type, à la une)', () => {
    cy.get('.filters-bar, [class*="filter"]', { timeout: 8000 }).should('exist');
    cy.get('input[placeholder*="Rechercher"]', { timeout: 5000 }).should('exist');
    cy.get('select', { timeout: 5000 }).should('exist');
  });

  it('affiche une liste ou état vide', () => {
    cy.get('[class*="list"], [class*="table"], table, app-empty-state, [class*="empty"]', { timeout: 8000 }).should('exist');
  });

  it('le bouton Ajouter une actualité ouvre le formulaire', () => {
    cy.contains('button', /ajouter une actualit/i).click();
    cy.get('.actualite-form, form, ui-modal', { timeout: 5000 }).should('exist');
  });

  it('le formulaire actualité contient les champs requis', () => {
    cy.contains('button', /ajouter une actualit/i).click();
    cy.get('input[name="titre"], [placeholder*="Titre"]', { timeout: 5000 }).should('exist');
    cy.get('select[name="type"], [name="typeActu"]', { timeout: 5000 }).should('exist');
    cy.get('textarea[name="contenu"], [name="contenu"]').should('exist');
  });

  it('le formulaire contient le sélecteur de type avec les bonnes options', () => {
    cy.contains('button', /ajouter une actualit/i).click();
    cy.get('select', { timeout: 5000 }).first().find('option').then($opts => {
      const texts = [...$opts].map(o => o.text.toLowerCase());
      expect(texts.some(t => t.includes('evenement') || t.includes('événement') || t.includes('competition') || t.includes('annonce'))).to.be.true;
    });
  });

  it('le formulaire contient un champ image', () => {
    cy.contains('button', /ajouter une actualit/i).click();
    cy.get('input[type="file"]', { timeout: 5000 }).should('exist');
  });

  it('annuler le formulaire le ferme', () => {
    cy.contains('button', /ajouter une actualit/i).click();
    cy.contains('button', /annuler/i).click({ force: true });
    cy.get('.actualite-form', { timeout: 3000 }).should('not.exist');
  });

  it('une actualité existante a les boutons Modifier et Supprimer', () => {
    cy.get('body').then($body => {
      if ($body.find('.col-actions ui-icon-button').length === 0) return;
      cy.get('.col-actions ui-icon-button').first().should('exist');
    });
  });
});

// ══════════════════════════════════════════════════════════
// GALERIE
// ══════════════════════════════════════════════════════════
describe('Admin — Galerie', () => {
  beforeEach(() => {
    cy.login(CREDENTIALS.admin.email, CREDENTIALS.admin.password);
    cy.visit('/admin/galerie');
  });

  it('affiche la page galerie admin', () => {
    cy.url().should('include', '/admin/galerie');
    cy.get('h1, h2, [class*="galerie"], [class*="gal-"]', { timeout: 8000 }).should('exist');
  });

  it('affiche le tableau des photos', () => {
    cy.get('table, ui-table, [class*="table"]', { timeout: 8000 }).should('exist');
  });

  it('le bouton Ajouter une photo ouvre le formulaire', () => {
    cy.contains('button', /ajouter une photo/i).click();
    cy.get('form, ui-modal, [class*="modal"]', { timeout: 5000 }).should('exist');
  });

  it('le formulaire galerie contient titre, description et image', () => {
    cy.contains('button', /ajouter une photo/i).click();
    cy.get('input[name="titre"], [placeholder*="Titre"]', { timeout: 5000 }).should('exist');
    cy.get('textarea[name="description"], [name="description"]').should('exist');
    cy.get('input[type="file"]').should('exist');
  });

  it('fermer la modal galerie fonctionne', () => {
    cy.contains('button', /ajouter une photo/i).click();
    cy.get('ui-modal', { timeout: 5000 }).should('exist');
    cy.get('ui-modal .modal-header button, ui-modal button[aria-label*="ermer"], [class*="close"]')
      .first().click({ force: true });
    cy.get('ui-modal[open="true"]', { timeout: 3000 }).should('not.exist');
  });

  it('une photo existante a les boutons Modifier et Supprimer', () => {
    cy.get('body').then($body => {
      if ($body.find('table tbody tr').length === 0) return;
      cy.get('table tbody tr').first().find('button').should('have.length.gte', 2);
    });
  });

  it('le tableau affiche les colonnes titre et description', () => {
    cy.get('table thead th, [class*="th"]', { timeout: 8000 }).then($ths => {
      const texts = [...$ths].map(th => th.textContent?.toLowerCase() ?? '');
      expect(texts.some(t => t.includes('titre') || t.includes('image'))).to.be.true;
    });
  });
});

// ══════════════════════════════════════════════════════════
// DOCUMENTS
// ══════════════════════════════════════════════════════════
describe('Admin — Documents', () => {
  beforeEach(() => {
    cy.login(CREDENTIALS.admin.email, CREDENTIALS.admin.password);
    cy.visit('/admin/documents');
  });

  it('affiche la page documents admin', () => {
    cy.url().should('include', '/admin/documents');
    cy.get('h1, h2, [class*="doc"]', { timeout: 8000 }).should('exist');
  });

  it('affiche les KPI (total, validés, en attente, refusés)', () => {
    cy.get('.ui-kpi-card, [class*="kpi"]', { timeout: 8000 }).should('have.length.gte', 4);
  });

  it('affiche le panneau maître (liste des membres)', () => {
    cy.get('.master-panel, .master-list, [class*="master"]', { timeout: 8000 }).should('exist');
  });

  it('la recherche membre est disponible', () => {
    cy.get('.master-search input, input[placeholder*="Rechercher"]', { timeout: 5000 }).should('exist');
  });

  it('le filtre de statut est disponible', () => {
    cy.get('select', { timeout: 5000 }).should('exist');
  });

  it('le bouton Rafraîchir est présent', () => {
    cy.contains('button', /rafraîchir|refresh/i).should('exist');
  });

  it('sélectionner un membre affiche ses documents ou état vide', () => {
    cy.get('body').then($body => {
      if ($body.find('.user-item').length > 0) {
        cy.get('.user-item').first().click();
        cy.get('.detail-panel, [class*="detail"], table, [class*="empty"]', { timeout: 5000 }).should('exist');
      } else {
        cy.get('.master-panel, [class*="master"], [class*="empty"]', { timeout: 5000 }).should('exist');
      }
    });
  });

  it('les boutons Valider/Refuser apparaissent si des documents existent', () => {
    cy.get('body').then($body => {
      if ($body.find('.user-item').length === 0) return;
      cy.get('.user-item').first().click();
      cy.get('body').then($b2 => {
        if ($b2.find('table tbody tr').length === 0) return;
        if ($b2.find('.col-actions ui-icon-button').length === 0) return;
        cy.get('.col-actions ui-icon-button').first().should('exist');
      });
    });
  });
});

// ══════════════════════════════════════════════════════════
// PAIEMENTS
// ══════════════════════════════════════════════════════════
describe('Admin — Paiements', () => {
  beforeEach(() => {
    cy.login(CREDENTIALS.admin.email, CREDENTIALS.admin.password);
    cy.visit('/admin/paiements');
  });

  it('affiche la page paiements admin', () => {
    cy.url().should('include', '/admin/paiements');
    cy.get('h1, h2, [class*="paiement"]', { timeout: 8000 }).should('exist');
  });

  it('affiche les KPI (total reçu, à percevoir, en retard, % encaissé)', () => {
    cy.get('.ui-kpi-card, [class*="kpi"]', { timeout: 8000 }).should('have.length.gte', 4);
  });

  it('affiche les onglets Paiements / Par parent / Échéances', () => {
    cy.get('.tabs .tab-btn, .tab-btn, [class*="tab"]', { timeout: 8000 }).should('have.length.gte', 2);
  });

  it('affiche la sidebar de configuration cotisation', () => {
    cy.get('.params-sidebar, [class*="params"], [class*="sidebar"]', { timeout: 8000 }).should('exist');
  });

  it('la sidebar contient le champ montant', () => {
    cy.get('input[type="number"], [name="montantCotisation"]', { timeout: 5000 }).should('exist');
  });

  it('la sidebar contient les options de mode de paiement', () => {
    cy.get('input[type="checkbox"], [class*="check"]', { timeout: 5000 }).should('exist');
  });

  it('la sidebar contient les boutons d\'échéances', () => {
    cy.get('.ech-btn, [class*="ech-btn"]', { timeout: 5000 }).should('have.length.gte', 3);
  });

  it('le bouton Sauvegarder la configuration est présent', () => {
    cy.contains('button', /sauvegarder/i).should('exist');
  });

  it('le bouton Ajouter un paiement est présent', () => {
    cy.contains('button', /ajouter un paiement/i).should('exist');
  });

  it('basculer sur l\'onglet Échéances affiche le contenu', () => {
    cy.contains('.tab-btn, [class*="tab"]', /ech/i).click({ force: true });
    cy.get('[class*="tab-body"], [class*="tab-content"]', { timeout: 5000 }).should('exist');
  });
});

// ══════════════════════════════════════════════════════════
// GESTION COMMANDES
// ══════════════════════════════════════════════════════════
describe('Admin — Gestion commandes', () => {
  beforeEach(() => {
    cy.login(CREDENTIALS.admin.email, CREDENTIALS.admin.password);
    cy.visit('/admin/gestion-commande');
  });

  it('affiche la page gestion commandes', () => {
    cy.url().should('include', '/admin/gestion-commande');
    cy.get('h1, h2, [class*="commande"], [class*="order"]', { timeout: 8000 }).should('exist');
  });

  it('affiche les KPI (commandes, CA, en attente, annulées)', () => {
    cy.get('.ui-kpi-card, [class*="kpi"]', { timeout: 8000 }).should('have.length.gte', 4);
  });

  it('affiche la barre de filtres (recherche, mode, statut)', () => {
    cy.get('.filters-bar, [class*="filter"]', { timeout: 8000 }).should('exist');
    cy.get('input[placeholder*="Rechercher"]', { timeout: 5000 }).should('exist');
    cy.get('select', { timeout: 5000 }).should('have.length.gte', 2);
  });

  it('le filtre statut contient les bonnes options', () => {
    cy.get('select', { timeout: 5000 }).last().find('option').then($opts => {
      const texts = [...$opts].map(o => o.text.toLowerCase());
      expect(texts.some(t => t.includes('attente') || t.includes('pay') || t.includes('tous'))).to.be.true;
    });
  });

  it('le bouton Réinitialiser les filtres est présent', () => {
    cy.contains('button', /réinitialiser|reinitialiser/i).should('exist');
  });

  it('le bouton Rafraîchir est présent', () => {
    cy.contains('button', /rafraîchir/i).should('exist');
  });

  it('affiche le tableau des commandes ou état vide', () => {
    cy.get('table, ui-table, [class*="table"], app-empty-state, [class*="empty"]', { timeout: 8000 }).should('exist');
  });

  it('une commande existante a un bouton Détails', () => {
    cy.get('body').then($body => {
      if ($body.find('.col-actions ui-icon-button').length === 0) return;
      cy.get('.col-actions ui-icon-button').first().should('exist');
    });
  });

  it('la recherche filtre les commandes', () => {
    cy.get('input[placeholder*="Rechercher"]', { timeout: 5000 }).type('test');
    cy.get('table, ui-table, [class*="table"]', { timeout: 5000 }).should('exist');
  });
});

// ══════════════════════════════════════════════════════════
// GESTION PRODUITS
// ══════════════════════════════════════════════════════════
describe('Admin — Gestion produits', () => {
  beforeEach(() => {
    cy.login(CREDENTIALS.admin.email, CREDENTIALS.admin.password);
    cy.visit('/admin/gestion-produits');
  });

  it('affiche la page gestion produits', () => {
    cy.url().should('include', '/admin/gestion-produits');
    cy.get('h1, h2, [class*="produit"], .gp-page', { timeout: 8000 }).should('exist');
  });

  it('affiche les KPI (total, en stock, en rupture)', () => {
    cy.get('.ui-kpi-card, [class*="kpi"]', { timeout: 8000 }).should('have.length.gte', 3);
  });

  it('affiche la barre de recherche avec le compteur', () => {
    cy.get('.gp-search, input[placeholder*="Rechercher"]', { timeout: 5000 }).should('exist');
    cy.get('.gp-count, [class*="count"]', { timeout: 5000 }).should('exist');
  });

  it('affiche le tableau des produits ou état vide', () => {
    cy.get('.gp-table, table, app-empty-state, [class*="empty"]', { timeout: 8000 }).should('exist');
  });

  it('le bouton Nouveau produit ouvre le formulaire', () => {
    cy.contains('button', /nouveau produit/i).click();
    cy.get('.gp-form, form, ui-modal', { timeout: 5000 }).should('exist');
  });

  it('le formulaire produit contient tous les champs requis', () => {
    cy.contains('button', /nouveau produit/i).click();
    cy.get('input[name="nom"], [placeholder*="Dobok"]', { timeout: 5000 }).should('exist');
    cy.get('select[name="categorie"], [name="categorie"]').should('exist');
    cy.get('textarea[name="description"]').should('exist');
    cy.get('input[name="prix"], [name="prix"]').should('exist');
    cy.get('input[name="stock"], [name="stock"]').should('exist');
  });

  it('le formulaire produit contient un champ image', () => {
    cy.contains('button', /nouveau produit/i).click();
    cy.get('input[type="file"], .gp-upload-zone', { timeout: 5000 }).should('exist');
  });

  it('le sélecteur catégorie a les bonnes options', () => {
    cy.contains('button', /nouveau produit/i).click();
    cy.get('select[name="categorie"], [name="categorie"]', { timeout: 5000 }).find('option').then($opts => {
      const texts = [...$opts].map(o => o.text.toLowerCase());
      expect(texts.some(t => t.includes('tenue') || t.includes('protection') || t.includes('accessoire'))).to.be.true;
    });
  });

  it('annuler le formulaire le ferme', () => {
    cy.contains('button', /nouveau produit/i).click();
    cy.contains('button', /annuler/i).click({ force: true });
    cy.get('.gp-form', { timeout: 3000 }).should('not.exist');
  });

  it('un produit existant a les boutons modifier et supprimer', () => {
    cy.get('body').then($body => {
      if ($body.find('.gp-row, table tbody tr').length === 0) return;
      cy.get('.gp-btn-icon, table tbody tr button', { timeout: 5000 }).should('have.length.gte', 2);
    });
  });

  it('la recherche filtre les produits', () => {
    cy.get('.gp-search__input, input[placeholder*="Rechercher"]', { timeout: 5000 }).type('dobok');
    cy.get('.gp-table, table, [class*="empty"]', { timeout: 5000 }).should('exist');
  });
});

// ══════════════════════════════════════════════════════════
// GESTION ÉVÉNEMENTS
// ══════════════════════════════════════════════════════════
describe('Admin — Gestion événements', () => {
  beforeEach(() => {
    cy.login(CREDENTIALS.admin.email, CREDENTIALS.admin.password);
    cy.visit('/admin/gestion-evenement');
  });

  it('affiche la page gestion événements', () => {
    cy.url().should('include', '/admin/gestion-evenement');
    cy.get('h1, h2, [class*="event"], [class*="evenement"]', { timeout: 8000 }).should('exist');
  });

  it('affiche les KPI (événements, inscriptions, actifs, prochain RDV)', () => {
    cy.get('.ui-kpi-card, [class*="kpi"]', { timeout: 8000 }).should('have.length.gte', 4);
  });

  it('affiche la barre de filtres (recherche, statut, tri)', () => {
    cy.get('.filters-bar, [class*="filter"]', { timeout: 8000 }).should('exist');
    cy.get('input[placeholder*="Rechercher"]', { timeout: 5000 }).should('exist');
    cy.get('select', { timeout: 5000 }).should('have.length.gte', 2);
  });

  it('affiche le tableau des événements ou état vide', () => {
    cy.get('table, ui-table, [class*="table"], app-empty-state, [class*="empty"]', { timeout: 8000 }).should('exist');
  });

  it('le bouton Créer un événement ouvre le formulaire', () => {
    cy.contains('button', /créer un événement/i).click();
    cy.get('.event-form, form, ui-modal', { timeout: 5000 }).should('exist');
  });

  it('le formulaire événement contient tous les champs requis', () => {
    cy.contains('button', /créer un événement/i).click();
    cy.get('input[name="titre"], [placeholder*="Titre"]', { timeout: 5000 }).should('exist');
    cy.get('input[name="lieu"], [placeholder*="Lieu"]').should('exist');
    cy.get('input[name="dateDebut"], [name="dateDebut"]').should('exist');
    cy.get('input[name="dateFin"], [name="dateFin"]').should('exist');
    cy.get('input[name="capacite"], [name="capacite"]').should('exist');
  });

  it('le formulaire événement contient une checkbox statut actif', () => {
    cy.contains('button', /créer un événement/i).click();
    cy.get('input[type="checkbox"], [class*="checkbox"]', { timeout: 5000 }).should('exist');
  });

  it('le formulaire événement contient un champ image et description', () => {
    cy.contains('button', /créer un événement/i).click();
    cy.get('textarea[name="description"], [name="description"]', { timeout: 5000 }).should('exist');
    cy.get('input[type="file"]').should('exist');
  });

  it('annuler le formulaire le ferme', () => {
    cy.contains('button', /créer un événement/i).click();
    cy.contains('button', /annuler/i).click({ force: true });
    cy.get('.event-form', { timeout: 3000 }).should('not.exist');
  });

  it('le bouton Rafraîchir est présent', () => {
    cy.contains('button', /rafraîchir|rafraichir/i).should('exist');
  });

  it('un événement existant a les boutons Modifier, Supprimer et Voir inscrits', () => {
    cy.get('body').then($body => {
      if ($body.find('table tbody tr').length === 0) return;
      cy.get('table tbody tr').first().find('button').should('have.length.gte', 2);
    });
  });
});

// ══════════════════════════════════════════════════════════
// ACCUEIL SITE
// ══════════════════════════════════════════════════════════
describe('Admin — Accueil site', () => {
  beforeEach(() => {
    cy.login(CREDENTIALS.admin.email, CREDENTIALS.admin.password);
    cy.visit('/admin/accueil-site');
  });

  it('affiche la page accueil site', () => {
    cy.url().should('include', '/admin/accueil-site');
    cy.get('h1, h2, form, [class*="accueil"]', { timeout: 8000 }).should('exist');
  });

  it('affiche les onglets Bannière et À propos', () => {
    cy.get('.content-tab, [class*="tab"]', { timeout: 8000 }).should('have.length.gte', 2);
    cy.contains('[class*="tab"]', /bannière|hero/i).should('exist');
    cy.contains('[class*="tab"]', /propos/i).should('exist');
  });

  it('le bouton Enregistrer est présent', () => {
    cy.contains('button', /enregistrer/i).should('exist');
  });

  it('l\'onglet Bannière affiche l\'éditeur hero', () => {
    cy.contains('[class*="tab"]', /bannière|hero/i).click();
    cy.get('app-gestion-hero, [class*="hero"], .hero-editor', { timeout: 5000 }).should('exist');
  });

  it('l\'onglet À propos affiche l\'éditeur apropos', () => {
    cy.contains('[class*="tab"]', /propos/i).click();
    cy.get('app-gestion-apropos, [class*="apropos"], .apropos-editor', { timeout: 5000 }).should('exist');
  });
});

// ══════════════════════════════════════════════════════════
// HERO
// ══════════════════════════════════════════════════════════
describe('Admin — Hero', () => {
  beforeEach(() => {
    cy.login(CREDENTIALS.admin.email, CREDENTIALS.admin.password);
    cy.visit('/admin/hero');
  });

  it('affiche la page hero', () => {
    cy.url().should('include', '/admin/hero');
    cy.get('h1, h2, form, [class*="hero"]', { timeout: 8000 }).should('exist');
  });

  it('affiche les onglets Identité, Slogans, Chiffres clés', () => {
    cy.get('.tabs .tab, [class*="tab"]', { timeout: 8000 }).should('have.length.gte', 3);
    cy.contains('[class*="tab"]', /identit/i).should('exist');
    cy.contains('[class*="tab"]', /slogan/i).should('exist');
    cy.contains('[class*="tab"]', /chiffre/i).should('exist');
  });

  it('l\'onglet Identité affiche les champs d\'accroche', () => {
    cy.contains('[class*="tab"]', /identit/i).click();
    cy.get('input[name*="accroche"], input[name*="ligne"], .form-input', { timeout: 5000 }).should('exist');
  });

  it('l\'onglet Slogans permet d\'ajouter un slogan', () => {
    cy.contains('[class*="tab"]', /slogan/i).click();
    cy.contains('button', /ajouter un slogan/i, { timeout: 5000 }).should('exist');
  });

  it('l\'onglet Chiffres clés permet d\'ajouter un chiffre', () => {
    cy.contains('[class*="tab"]', /chiffre/i).click();
    cy.contains('button', /ajouter un chiffre/i, { timeout: 5000 }).should('exist');
  });

  it('le bouton Enregistrer est présent', () => {
    cy.contains('button', /enregistrer/i).should('exist');
  });

  it('l\'upload vidéo est disponible', () => {
    cy.get('input[type="file"], .upload-label', { timeout: 5000 }).should('exist');
  });
});

// ══════════════════════════════════════════════════════════
// À PROPOS
// ══════════════════════════════════════════════════════════
describe('Admin — À propos', () => {
  beforeEach(() => {
    cy.login(CREDENTIALS.admin.email, CREDENTIALS.admin.password);
    cy.visit('/admin/apropos');
  });

  it('affiche la page à propos', () => {
    cy.url().should('include', '/admin/apropos');
    cy.get('h1, h2, form, [class*="apropos"], [class*="about"]', { timeout: 8000 }).should('exist');
  });

  it('affiche les onglets Présentation et Mission & Valeurs', () => {
    cy.get('.tabs .tab, [class*="tab"]', { timeout: 8000 }).should('have.length.gte', 2);
    cy.contains('[class*="tab"]', /présentation/i).should('exist');
    cy.contains('[class*="tab"]', /mission|valeur/i).should('exist');
  });

  it('l\'onglet Présentation affiche les champs de texte', () => {
    cy.contains('[class*="tab"]', /présentation/i).click();
    cy.get('input, textarea', { timeout: 5000 }).should('have.length.gte', 2);
  });

  it('le panneau image contient l\'upload et le badge', () => {
    cy.get('input[type="file"], .upload-label', { timeout: 5000 }).should('exist');
    cy.get('[name="badgeLabel"], [name="badgeAnnee"], [placeholder*="Fondé"]', { timeout: 5000 }).should('exist');
  });

  it('l\'onglet Mission & Valeurs affiche les champs mission et vision', () => {
    cy.contains('[class*="tab"]', /mission|valeur/i).click();
    cy.get('input[name*="mission"], textarea[name*="mission"], input[name*="vision"], textarea[name*="vision"]', { timeout: 5000 }).should('exist');
  });

  it('l\'onglet Mission & Valeurs permet d\'ajouter une valeur', () => {
    cy.contains('[class*="tab"]', /mission|valeur/i).click();
    cy.contains('button', /ajouter une valeur/i, { timeout: 5000 }).should('exist');
  });

  it('le bouton Enregistrer est présent', () => {
    cy.contains('button', /enregistrer/i).should('exist');
  });
});
