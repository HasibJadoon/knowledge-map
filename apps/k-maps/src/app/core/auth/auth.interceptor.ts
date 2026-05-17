import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'km_token';

/**
 * Attaches the stored bearer token to API requests and, on a 401, clears the
 * token and redirects to the login screen. Login / bootstrap endpoints are
 * left untouched so they remain reachable while signed out.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const isApi = req.url.startsWith(environment.apiBase) || req.url.startsWith('/api');
  const isAuthEndpoint = req.url.includes('/core/auth/') || req.url.includes('/seed-admin');

  let request = req;
  if (isApi && !isAuthEndpoint) {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      request = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    }
  }

  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        isApi &&
        !isAuthEndpoint
      ) {
        localStorage.removeItem(TOKEN_KEY);
        if (!router.url.startsWith('/login')) {
          void router.navigateByUrl('/login', { replaceUrl: true });
        }
      }
      return throwError(() => error);
    }),
  );
};
