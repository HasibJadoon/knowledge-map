import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { isTokenValid } from './auth.utils';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  private readonly router = inject(Router);

  canActivate(): boolean | UrlTree {
    const token = localStorage.getItem('auth_token');
    if (isTokenValid(token)) {
      return true;
    }

    if (token) {
      localStorage.removeItem('auth_token');
    }
    return this.router.parseUrl('/login');
  }
}
