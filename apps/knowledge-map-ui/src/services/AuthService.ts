import { Injectable } from '@angular/core';
import { LocalStorageService } from '@coreui/angular';

export interface LoginResponse {
  token: string;
  expiresAt: string; // ISO date string
}

export interface ApiErrorResponse {
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  // 🔐 Centralized storage keys
  private readonly TOKEN_KEY = 'token';
  private readonly EXP_KEY = 'token_exp';

  constructor(private storage: LocalStorageService) {}

  // =====================================================
  // login
  // =====================================================

  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      let msg = `Login failed (${res.status})`;
      try {
        const data = (await res.json()) as ApiErrorResponse;
        if (data?.message) msg = data.message;
      } catch {
        // ignore JSON parse errors
      }
      throw new Error(msg);
    }

    const data = (await res.json()) as LoginResponse;

    if (!data?.token || !data?.expiresAt) {
      throw new Error('Invalid login response: token/expiresAt missing');
    }

    this.setToken(data.token, data.expiresAt);
    return data;
  }

  // =====================================================
  // token management
  // =====================================================

  setToken(token: string, expiresAtIso: string): void {
    this.storage.setItem(this.TOKEN_KEY, token);
    this.storage.setItem(this.EXP_KEY, expiresAtIso);
  }

  get token(): string | null {
    return this.storage.getItem(this.TOKEN_KEY);
  }

  get expiresAt(): string | null {
    return this.storage.getItem(this.EXP_KEY);
  }

  logout(): void {
    this.storage.removeItem(this.TOKEN_KEY);
    this.storage.removeItem(this.EXP_KEY);
  }

  // =====================================================
  // auth state
  // =====================================================

  isLoggedIn(): boolean {
    const token = this.token;
    const exp = this.expiresAt;

    if (!token || !exp) return false;

    const expMs = Date.parse(exp);
    if (!Number.isFinite(expMs)) return false;

    return Date.now() < expMs;
  }

  // =====================================================
  // headers helper (optional but useful)
  // =====================================================

  authHeaders(): HeadersInit {
    return this.isLoggedIn()
      ? { Authorization: `Bearer ${this.token}` }
      : {};
  }
}
