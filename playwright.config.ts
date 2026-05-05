import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:4200',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'fr-FR',
  },
  webServer: {
    command: 'npx ng serve',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  reporter: [['list'], ['html', { open: 'never' }]],
});
