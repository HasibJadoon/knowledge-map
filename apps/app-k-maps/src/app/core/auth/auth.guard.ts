import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';

/**
 * Authentication is disabled for now — every route is accessible without a
 * login. Kept as a no-op so existing `canActivate: [AuthGuard]` route configs
 * continue to compile; restore the token check here to re-enable auth.
 */
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}
