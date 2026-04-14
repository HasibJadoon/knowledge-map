import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';

import { isAdminToken, isTokenValid } from './auth.utils';

@Injectable({
  providedIn: 'root',
})
export class AdminGuard implements CanActivate {
  private readonly router = inject(Router);

  canActivate(): boolean | UrlTree {
    const token = localStorage.getItem('auth_token');
    if (!isTokenValid(token)) {
      if (token) {
        localStorage.removeItem('auth_token');
      }

      return this.router.parseUrl('/login');
    }

    if (isAdminToken(token)) {
      return true;
    }

    return this.router.parseUrl('/home');
  }
}
