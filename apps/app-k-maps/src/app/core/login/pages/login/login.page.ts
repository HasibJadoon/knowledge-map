import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { isTokenValid } from '../../../auth/auth.utils';
import { environment } from '../../../../../environments/environment';

type LoginResponse = {
  ok?: boolean;
  data?: { token?: string; expires_in?: number };
  error?: { code?: string; message?: string };
};

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  standalone: false,
})
export class LoginPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly apiBase = environment.apiBase;
  private readonly tokenKey = 'auth_token';
  errorMessage = '';
  loading = false;

  form = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  ionViewWillEnter(): void {
    // Ensure the bootstrap admin account exists (idempotent, public).
    this.http.post(`${this.apiBase}/core/users/seed-admin`, {}).subscribe({ error: () => {} });

    const token = localStorage.getItem(this.tokenKey);
    if (isTokenValid(token)) {
      this.router.navigateByUrl('/home', { replaceUrl: true });
      return;
    }

    if (token) {
      localStorage.removeItem(this.tokenKey);
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.loading = true;

    const payload = {
      email: this.form.value.email ?? '',
      password: this.form.value.password ?? '',
    };

    this.http.post<LoginResponse>(`${this.apiBase}/core/auth/login`, payload).subscribe({
      next: (response) => {
        const token = response.data?.token;
        if (response.ok && token) {
          localStorage.setItem(this.tokenKey, token);
          this.router.navigateByUrl('/home', { replaceUrl: true });
          return;
        }

        this.errorMessage = response.error?.message || 'Login failed';
        this.loading = false;
      },
      error: (error) => {
        if (error?.status === 401) {
          localStorage.removeItem(this.tokenKey);
        }

        this.errorMessage = error?.error?.error?.message || 'Login failed';
        this.loading = false;
      },
    });
  }
}
