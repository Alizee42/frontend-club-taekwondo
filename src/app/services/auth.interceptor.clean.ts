import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const validToken = auth.isConnecte() ? auth.getToken() : null;

  const isPublicEndpoint =
    req.url.includes('/public/') ||
    (req.method === 'GET' && req.url.includes('/galerie'));

  const isOptionalEndpoint = req.url.includes('/parametres-paiement');

  if (validToken && !isPublicEndpoint) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${validToken}`,
      },
    });
  }

  return next(req).pipe(
    catchError((error) => {
      if (!isOptionalEndpoint) {
        console.error('[AuthInterceptor] Erreur interceptee', {
          url: req.url,
          status: error.status,
          message: error.message,
        });
      } else {
        console.warn('[AuthInterceptor] Erreur ignoree sur endpoint optionnel:', req.url);
      }

      if (error.status === 401 && !isOptionalEndpoint) {
        const currentPath = window.location.pathname;
        const isPrivatePage =
          currentPath.includes('/admin/') ||
          currentPath.includes('/membre/') ||
          currentPath.includes('/parent/');

        if (isPrivatePage && validToken) {
          console.warn('[AuthInterceptor] 401 sur page privee -> deconnexion forcee');
          auth.logout();
          router.navigate(['/connexion']);
        } else {
          console.info('[AuthInterceptor] 401 ignore - pas sur page privee');
        }
      }

      return throwError(() => error);
    })
  );
};
