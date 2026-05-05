import { HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ToastService } from '../shared/toast/toast.service';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<any> => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toastService = inject(ToastService);

  const validToken = auth.isConnecte() ? auth.getToken() : null;
  const isOnAdmin = window.location.pathname.startsWith('/admin');
  const isPublicEndpoint = req.url.includes('/public/')
    || (req.method === 'GET' && req.url.includes('/hero-config'))
    || (req.method === 'GET' && req.url.includes('/about-config'))
    || (req.method === 'GET' && req.url.match(/\/galerie(\?|$|\/[^a-zA-Z])/) && !isOnAdmin)
    || (req.method === 'GET' && req.url.match(/\/api\/galeries\/club\/[0-9]+$/));
  const isOptionalEndpoint = req.url.includes('/parametres-paiement');

  if (validToken && !isPublicEndpoint) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${validToken}`,
      },
    });
  }

  return next(req).pipe(
    catchError((error: any) => {
      if (!isOptionalEndpoint) {
        if (error.status === 0) {
          toastService.error('Connexion au serveur impossible. Verifiez le backend ou votre reseau.');
        } else if (error.status === 401) {
          toastService.error('Identifiants incorrects ou session expiree.');
        } else if (error.status === 403) {
          toastService.error("Acces interdit. Vous n'avez pas les droits.");
        } else if (error.status === 500) {
          toastService.error("Erreur serveur. Veuillez reessayer plus tard ou contacter l'administrateur.");
        }
      }

      if (error.status === 401 && !isOptionalEndpoint) {
        const currentPath = window.location.pathname;
        const isPrivatePage = currentPath.includes('/admin/')
          || currentPath.includes('/membre/')
          || currentPath.includes('/parent/');

        if (isPrivatePage && validToken) {
          auth.logout();
          router.navigate(['/connexion']);
        }
      }

      return throwError(() => error);
    })
  );
};
