import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = localStorage.getItem('token'); // ✅ une seule clé cohérente

  // 🔎 Debug log
  console.log(
    '[AuthInterceptor] URL =', req.url,
    '| Token trouvé =', token ? 'OUI' : 'NON'
  );

  // On ajoute le token uniquement s'il existe
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log(
      '[AuthInterceptor] Header Authorization ajouté ✅',
      req.headers.get('Authorization')
    );
  }

  return next(req).pipe(
    catchError((error) => {
      console.error('[AuthInterceptor] Erreur interceptée ❌', {
        url: req.url,
        status: error.status,
        message: error.message,
      });

      // 🚨 Redirection vers /connexion UNIQUEMENT si l'utilisateur avait déjà un token
      if (error.status === 401 && token) {
        console.warn('[AuthInterceptor] 401 avec token → déconnexion forcée');
        auth.logout();
        router.navigate(['/connexion']);
      }

      return throwError(() => error);
    })
  );
};
