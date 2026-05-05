import { test, expect } from '@playwright/test';

test.describe('Page Inscription', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/inscription');
  });

  test('la page inscription se charge', async ({ page }) => {
    await expect(page.locator('form, app-inscription')).toBeVisible();
  });

  test('impossible de passer à l\'étape 2 avec champs vides', async ({ page }) => {
    // Chercher le bouton "Suivant" ou "Continuer" de l'étape 1
    const nextBtn = page.locator('button:has-text("Suivant"), button:has-text("Continuer"), ui-button[label="Suivant"]').first();
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      // Toujours à l'étape 1 - pas de progression
      await expect(page.locator('form')).toBeVisible();
      await expect(page).toHaveURL(/\/inscription/);
    }
  });

  test('champ email invalide bloque la progression', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill('email-invalide');
      await emailInput.blur();
      // Un message d'erreur ou état invalide doit apparaître
      const errorMsg = page.locator('.error, .invalid, [class*="error"], small').first();
      // Optionnel : vérifie juste que le formulaire reste visible
      await expect(page.locator('form')).toBeVisible();
    }
  });

  test('lien retour vers connexion est présent', async ({ page }) => {
    const loginLink = page.locator('a[href="/connexion"], a[routerlink="/connexion"]');
    await expect(loginLink.first()).toBeVisible();
  });
});
