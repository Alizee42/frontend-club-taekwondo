
import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // on cible les appels backend
  const isApi = req.url.startsWith('/api/') || req.url.includes('http://localhost:8080/api/');
  if (!isApi) return next(req);

  const token = localStorage.getItem('token');
  if (!token) return next(req);

  const cloned = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  });
  return next(cloned);
};
