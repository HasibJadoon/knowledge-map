import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { LocalStorageService } from '@coreui/angular';

@Injectable({ providedIn: 'root' })
export class RootRedirectGuard {
  constructor(
    private router: Router,
    private storage: LocalStorageService
  ) {}

  canActivate(): boolean {
    const token = this.storage.getItem('token');
    const exp = this.storage.getItem('token_exp');

    const loggedIn =
      !!token && !!exp && Date.now() < Date.parse(exp);

    this.router.navigate([loggedIn ? '/dashboard' : '/login']);
    return false; // stop route activation
  }
}
