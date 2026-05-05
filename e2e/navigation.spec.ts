import { test, expect } from '@playwright/test';

test.describe('Navigation publique', () => {

  test('la page accueil se charge', async ({ page }) => {
    await page.goto('/');
    await expect(page).not.toHaveURL('/connexion');
    await expect(page.locator('universal-header, app-root')).toBeVisible();
  });

  test('le header affiche le bouton connexion quand non connecté', async ({ page }) => {
    await page.goto('/');
    const loginBtn = page.locator('a[routerlink="/connexion"], a[href="/connexion"]');
    await expect(loginBtn.first()).toBeVisible();
  });

  test('le footer est visible sur la page accueil', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer, app-footer');
    await expect(footer.first()).toBeVisible();
  });

  test('le footer est visible sur la page contact', async ({ page }) => {
    await page.goto('/contact');
    const footer = page.locator('footer, app-footer');
    await expect(footer.first()).toBeVisible();
  });

  test('route protégée /admin redirige vers /connexion', async ({ page }) => {
    await page.goto('/admin/dashboard-admin');
    await expect(page).toHaveURL(/\/connexion/);
  });

  test('route protégée /membre redirige vers /connexion', async ({ page }) => {
    await page.goto('/membre/dashboard-membre');
    await expect(page).toHaveURL(/\/connexion/);
  });

  test('route protégée /parent redirige vers /connexion', async ({ page }) => {
    await page.goto('/parent/dashboard-parent');
    await expect(page).toHaveURL(/\/connexion/);
  });

  test('la page galerie est accessible publiquement', async ({ page }) => {
    await page.goto('/galerie');
    await expect(page).not.toHaveURL(/\/connexion/);
  });

  test('la page événements est accessible publiquement', async ({ page }) => {
    await page.goto('/evenements');
    await expect(page).not.toHaveURL(/\/connexion/);
  });
});
