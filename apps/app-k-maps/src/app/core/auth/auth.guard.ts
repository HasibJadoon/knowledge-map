import { Injectable, inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { isTokenValid, tokenRequiresPasswordChange } from './auth.utils';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  private readonly router = inject(Router);

  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    const token = localStorage.getItem('auth_token');
    if (!isTokenValid(token)) {
      if (token) {
        localStorage.removeItem('auth_token');
      }
      return this.router.parseUrl('/login');
    }

    // A holder of a temporary password must set a new one before reaching
    // any other screen.
    if (tokenRequiresPasswordChange(token) && !state.url.startsWith('/change-password')) {
      return this.router.parseUrl('/change-password');
    }

    return true;
  }
}
