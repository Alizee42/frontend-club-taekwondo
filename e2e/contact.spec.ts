import { test, expect } from '@playwright/test';

test.describe('Page Contact', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/contact');
  });

  test('la page contact se charge', async ({ page }) => {
    await expect(page.locator('form, app-contact')).toBeVisible();
  });

  test('les champs nom, email, message sont présents', async ({ page }) => {
    await expect(page.locator('input[name="name"], input[id="name"]').first()).toBeVisible();
    await expect(page.locator('input[name="email"], input[type="email"]').first()).toBeVisible();
    await expect(page.locator('textarea[name="message"], textarea[id="message"]').first()).toBeVisible();
  });

  test('le bouton envoyer est présent', async ({ page }) => {
    const submitBtn = page.locator('button[type="submit"], ui-button[type="submit"]').first();
    await expect(submitBtn).toBeVisible();
  });

  test('soumission avec champs vides reste sur la page', async ({ page }) => {
    const submitBtn = page.locator('button[type="submit"], ui-button[type="submit"]').first();
    await submitBtn.click();
    await expect(page).toHaveURL(/\/contact/);
  });

  test('les infos de contact du club sont affichées', async ({ page }) => {
    // La page contact affiche l'adresse ou le téléphone du club
    const contactInfo = page.locator('.contact-info, .info-card, [class*="contact"]').first();
    await expect(contactInfo).toBeVisible();
  });
});
