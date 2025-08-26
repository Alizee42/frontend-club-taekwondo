// src/app/app.config.ts
import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

// 👉 importe l’interceptor
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // 👉 on ajoute l’interceptor ici
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),
    importProvidersFrom(CommonModule, FormsModule),
  ]
};
