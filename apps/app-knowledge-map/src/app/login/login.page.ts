import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { isTokenValid } from '../auth/auth.utils';

type LoginResponse = {
  ok?: boolean;
  token?: string;
  expiresAt?: string;
  error?: string;
  message?: string;
};

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {
  private readonly apiBase = 'https://api-kmap.com';
  private readonly tokenKey = 'auth_token';
  errorMessage = '';
  loading = false;

  form = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}

  ionViewWillEnter(): void {
    const token = localStorage.getItem(this.tokenKey);
    if (isTokenValid(token)) {
      this.router.navigateByUrl('/tabs', { replaceUrl: true });
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

    this.http.post<LoginResponse>(`${this.apiBase}/login`, payload).subscribe({
      next: (response) => {
        if (response.ok && response.token) {
          localStorage.setItem(this.tokenKey, response.token);
          this.router.navigateByUrl('/tabs', { replaceUrl: true });
          return;
        }

        this.errorMessage = response.message || response.error || 'Login failed';
        this.loading = false;
      },
      error: (error) => {
        if (error?.status === 401) {
          localStorage.removeItem(this.tokenKey);
        }

        const apiError = error?.error?.message || error?.error?.error;
        this.errorMessage = apiError || 'Login failed';
        this.loading = false;
      },
    });
  }
}
