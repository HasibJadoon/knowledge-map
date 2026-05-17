import { Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { environment } from '../../../../../environments/environment';
import { tokenRequiresPasswordChange } from '../../auth.utils';

type ChangePasswordResponse = {
  ok?: boolean;
  data?: { token?: string; expires_in?: number };
  error?: { code?: string; message?: string };
};

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule],
  templateUrl: './change-password.page.html',
  styleUrl: './change-password.page.scss',
})
export class ChangePasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  private readonly apiBase = environment.apiBase;
  private readonly tokenKey = 'auth_token';

  /** Forced mode — the account was issued a temporary password. */
  readonly forced = tokenRequiresPasswordChange(localStorage.getItem(this.tokenKey));

  loading = false;
  errorMessage = '';

  form = this.fb.group({
    current_password: ['', [Validators.required]],
    new_password: ['', [Validators.required, Validators.minLength(8)]],
    confirm: ['', [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.value;
    if (v.new_password !== v.confirm) {
      this.errorMessage = 'New passwords do not match';
      return;
    }
    if (v.new_password === v.current_password) {
      this.errorMessage = 'New password must differ from the current one';
      return;
    }

    this.errorMessage = '';
    this.loading = true;
    this.http
      .post<ChangePasswordResponse>(`${this.apiBase}/core/auth/change-password`, {
        current_password: v.current_password ?? '',
        new_password: v.new_password ?? '',
      })
      .subscribe({
        next: (res) => {
          const token = res.data?.token;
          if (res.ok && token) {
            localStorage.setItem(this.tokenKey, token);
            this.loading = false;
            void this.router.navigateByUrl('/home', { replaceUrl: true });
            return;
          }
          this.loading = false;
          this.errorMessage = res.error?.message || 'Could not change the password';
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err?.error?.error?.message || 'Could not change the password';
        },
      });
  }

  cancel(): void {
    this.location.back();
  }

  signOut(): void {
    localStorage.removeItem(this.tokenKey);
    void this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
