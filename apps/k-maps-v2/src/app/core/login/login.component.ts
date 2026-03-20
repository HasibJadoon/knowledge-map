import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

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

  submit(): void {
    if (!this.email || !this.password) return;
    this.loading.set(true);
    this.error.set(null);
    this.http.post<{ ok: boolean; token: string }>(`${environment.apiBase}/login`, {
      email: this.email,
      password: this.password,
    }).subscribe({
      next: (res) => {
        if (res?.token) {
          localStorage.setItem('km_token', res.token);
        }
        this.loading.set(false);
        this.router.navigate(['/hub']);
      },
      error: (e) => {
        this.error.set(e?.error?.error ?? 'Invalid credentials');
        this.loading.set(false);
      },
    });
  }
}
