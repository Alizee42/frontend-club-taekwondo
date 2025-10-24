import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { ToastService } from '../shared/toast/toast.service';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<any> => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toastService = inject(ToastService);

  const token = localStorage.getItem('token');

  // 🔒 Vérifier si cette requête nécessite une authentification
  // Seule la galerie publique (GET /galerie SANS /admin) est publique
  const isOnAdmin = window.location.pathname.startsWith('/admin');
  const isPublicEndpoint = req.url.includes('/public/') ||
    (req.method === 'GET' && req.url.match(/\/galerie(\?|$|\/[^a-zA-Z])/) && !isOnAdmin) ||
    (req.method === 'GET' && req.url.match(/\/api\/galeries\/club\/[0-9]+$/));
  // Les endpoints d'admin (ex: /admin/galerie) ne sont PAS publics

  // ✅ Endpoints qui peuvent échouer sans impact sur l'UX
  const isOptionalEndpoint = req.url.includes('/parametres-paiement');

  // ✅ Validation du token avant de l'envoyer
  let validToken = token;
  if (token) {
    try {
      // Vérifier si le token n'est pas expiré (basique)
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);

      if (tokenPayload.exp && tokenPayload.exp < currentTime) {
        console.warn('[AuthInterceptor] Token expiré, suppression');
        localStorage.removeItem('token');
        validToken = null;
      }
    } catch (error) {
      console.warn('[AuthInterceptor] Token invalide, suppression');
      localStorage.removeItem('token');
      validToken = null;
    }
  }

  // ✅ Debug log supprimé

  // On ajoute le token uniquement s'il existe ET si ce n'est pas une route publique
  if (validToken && !isPublicEndpoint) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${validToken}`,
      },
    });
  // ...log supprimé...
  }

  return next(req).pipe(
  catchError((error: any) => {
      if (!isOptionalEndpoint) {
        console.error('[AuthInterceptor] Erreur interceptée ❌', {
          url: req.url,
          status: error.status,
          message: error.message,
        });
        // Affichage toast selon le type d'erreur
        if (error.status === 0) {
          toastService.error('Connexion au serveur impossible. Vérifiez le backend ou votre réseau.');
        } else if (error.status === 401) {
          toastService.error('❌ Identifiants incorrects ou session expirée.');
        } else if (error.status === 403) {
          toastService.error('⛔ Accès interdit. Vous n’avez pas les droits.');
        } else if (error.status === 500) {
          toastService.error('Erreur serveur. Veuillez réessayer plus tard ou contacter l’administrateur.');
        }
      } else {
        console.warn('[AuthInterceptor] Erreur ignorée sur endpoint optionnel:', req.url);
      }

      // 🚨 Redirection vers /connexion UNIQUEMENT pour les routes protégées
      if (error.status === 401 && !isOptionalEndpoint) {
        const currentPath = window.location.pathname;
        const isPrivatePage = currentPath.includes('/admin/') || 
                             currentPath.includes('/membre/') || 
                             currentPath.includes('/parent/');
        if (isPrivatePage && validToken) {
          console.warn('[AuthInterceptor] 401 sur page privée → déconnexion forcée');
          auth.logout();
          router.navigate(['/connexion']);
        } else {
          console.info('[AuthInterceptor] 401 ignoré - pas sur page privée');
        }
      }
      return throwError(() => error);
    })
  );
};