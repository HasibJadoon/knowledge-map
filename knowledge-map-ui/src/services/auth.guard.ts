import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { LocalStorageService } from '@coreui/angular';

@Injectable({ providedIn: 'root' })
export class AuthGuard {
  constructor(
    private router: Router,
    private storage: LocalStorageService
  ) {}

  canActivate(): boolean {
    const token = this.storage.getItem('token');
    const exp = this.storage.getItem('token_exp');

    if (!token || !exp || Date.now() > Date.parse(exp)) {
      this.router.navigate(['/login']);
      return false;
    }

    return true;
  }
}
