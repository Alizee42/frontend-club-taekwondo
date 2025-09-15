// src/app/app.config.ts
import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { routes } from './app.routes';
// 👉 Interceptor JWT (chemin corrigé)
import { authInterceptor } from './services/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // Routing
    provideRouter(routes),

    // Http + Interceptors
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),

    // Modules globaux
    importProvidersFrom(
      CommonModule,
      FormsModule
    )
  ]
};
