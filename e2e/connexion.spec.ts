import { test, expect } from '@playwright/test';

test.describe('Page Connexion', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/connexion');
  });

  test('la page connexion se charge correctement', async ({ page }) => {
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
  });

  test('soumission avec champs vides ne navigue pas', async ({ page }) => {
    const submitBtn = page.locator('button[type="submit"], ui-button[type="submit"]').first();
    await submitBtn.click();
    await expect(page).toHaveURL(/\/connexion/);
  });

  test('identifiants incorrects affiche un toast d\'erreur', async ({ page }) => {
    await page.fill('input[type="email"], input[name="email"]', 'faux@test.com');
    await page.fill('input[type="password"], input[name="password"]', 'mauvaismdp');
    await page.locator('button[type="submit"], ui-button[type="submit"]').first().click();

    // Toast d'erreur visible (le container de toasts existe)
    await expect(page.locator('.toast-stack, .message-box, [role="alert"]').first()).toBeVisible({ timeout: 5000 });
    // Toujours sur la page connexion
    await expect(page).toHaveURL(/\/connexion/);
  });

  test('lien vers inscription est présent', async ({ page }) => {
    const inscriptionLink = page.locator('a[href="/inscription"], a[routerlink="/inscription"]');
    await expect(inscriptionLink.first()).toBeVisible();
  });
});
