import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Global error handlers to capture runtime issues when the page stays blanche
window.addEventListener('error', (event: any) => {
  try {
    // eslint-disable-next-line no-console
    console.error('[GLOBAL ERROR]', event.error ?? event.message, event);
  } catch (e) {
    // ignore
  }
});
window.addEventListener('unhandledrejection', (event: any) => {
  try {
    // eslint-disable-next-line no-console
    console.error('[UNHANDLED REJECTION]', event.reason, event);
  } catch (e) {
    // ignore
  }
});

// Small bootstrap logs
// eslint-disable-next-line no-console
console.log('[MAIN] bootstrap start', new Date().toISOString());

// APP LOGS panel removed — use DevTools console for runtime logs

bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    // eslint-disable-next-line no-console
    console.log('[MAIN] bootstrap success', new Date().toISOString());
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[MAIN] bootstrap error', err);
  });
