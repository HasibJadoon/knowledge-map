import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface LoginResponse {
  ok?: boolean;
  data?: { token?: string };
  error?: { message?: string };
}

@Component({
  selector: 'km-login',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private router = inject(Router);
  private http = inject(HttpClient);

  email = '';
  password = '';
  loading = signal(false);
  error = signal<string | null>(null);

  constructor() {
    // Ensure the bootstrap admin account exists (idempotent, public endpoint).
    this.http.post(`${environment.apiBase}/core/users/seed-admin`, {}).subscribe({ error: () => {} });
  }

  submit(): void {
    if (!this.email || !this.password) return;
    this.loading.set(true);
    this.error.set(null);
    this.http
      .post<LoginResponse>(`${environment.apiBase}/core/auth/login`, {
        email: this.email,
        password: this.password,
      })
      .subscribe({
        next: (res) => {
          const token = res?.data?.token;
          this.loading.set(false);
          if (token) {
            localStorage.setItem('km_token', token);
            void this.router.navigate(['/hub']);
            return;
          }
          this.error.set('Login failed');
        },
        error: (e) => {
          this.error.set(e?.error?.error?.message ?? 'Invalid credentials');
          this.loading.set(false);
        },
      });
  }
}
