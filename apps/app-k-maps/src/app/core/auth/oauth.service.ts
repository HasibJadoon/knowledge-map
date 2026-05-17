// ─── OAuthService — Google / Apple sign-in (config-driven) ────────────────────
// The backend (/core/auth/providers) decides which providers are live. This
// service loads the provider SDKs on demand, surfaces the official Google
// button, and runs the Apple popup flow. Callers exchange the returned ID
// token for a K-MAPS session token via /core/auth/oauth/<provider>.

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OAuthProvidersConfig } from '../../features/workspace/workspace.model';

interface GoogleCredentialResponse { credential: string; }

interface GoogleIdApi {
  initialize(config: { client_id: string; callback: (r: GoogleCredentialResponse) => void }): void;
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
}

interface AppleAuthResult {
  authorization?: { id_token?: string };
  user?: { name?: { firstName?: string; lastName?: string } };
}

interface AppleAuthApi {
  init(config: { clientId: string; scope: string; redirectURI: string; usePopup: boolean }): void;
  signIn(): Promise<AppleAuthResult>;
}

interface OAuthWindow extends Window {
  google?: { accounts?: { id?: GoogleIdApi } };
  AppleID?: { auth?: AppleAuthApi };
}

const GOOGLE_SDK = 'https://accounts.google.com/gsi/client';
const APPLE_SDK =
  'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';

const DISABLED_CONFIG: OAuthProvidersConfig = {
  google: { enabled: false, client_id: '' },
  apple: { enabled: false, client_id: '', redirect_uri: '', scope: 'name email' },
};

@Injectable({ providedIn: 'root' })
export class OAuthService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBase;

  private configPromise: Promise<OAuthProvidersConfig> | null = null;
  private readonly scripts = new Map<string, Promise<void>>();

  /** Fetch (and cache) which providers the backend has configured. */
  loadConfig(): Promise<OAuthProvidersConfig> {
    if (!this.configPromise) {
      this.configPromise = firstValueFrom(
        this.http.get<{ ok: boolean; data: OAuthProvidersConfig }>(
          `${this.base}/core/auth/providers`,
        ),
      )
        .then((res) => res?.data ?? DISABLED_CONFIG)
        .catch(() => DISABLED_CONFIG);
    }
    return this.configPromise;
  }

  /**
   * Render the official Google sign-in button into `container`. Resolves to
   * false (a no-op) when Google is not configured. `onToken` receives the
   * Google ID token when the user completes sign-in.
   */
  async renderGoogleButton(
    container: HTMLElement,
    onToken: (idToken: string) => void,
  ): Promise<boolean> {
    const config = await this.loadConfig();
    if (!config.google.enabled) return false;

    await this.loadScript(GOOGLE_SDK, () => !!this.win.google?.accounts?.id);
    const idApi = this.win.google?.accounts?.id;
    if (!idApi) return false;

    idApi.initialize({
      client_id: config.google.client_id,
      callback: (r) => { if (r?.credential) onToken(r.credential); },
    });
    container.replaceChildren();
    idApi.renderButton(container, {
      theme: 'filled_black',
      size: 'large',
      shape: 'pill',
      text: 'continue_with',
      logo_alignment: 'center',
      width: 260,
    });
    return true;
  }

  /** Run the Apple popup flow; resolves with the Apple ID token (+ name). */
  async signInWithApple(): Promise<{ idToken: string; name?: string }> {
    const config = await this.loadConfig();
    if (!config.apple.enabled) throw new Error('Apple sign-in is not configured');

    await this.loadScript(APPLE_SDK, () => !!this.win.AppleID?.auth);
    const authApi = this.win.AppleID?.auth;
    if (!authApi) throw new Error('Apple sign-in could not be loaded');

    authApi.init({
      clientId: config.apple.client_id,
      scope: config.apple.scope || 'name email',
      redirectURI: config.apple.redirect_uri,
      usePopup: true,
    });

    const result = await authApi.signIn();
    const idToken = result?.authorization?.id_token;
    if (!idToken) throw new Error('Apple sign-in returned no token');

    const n = result?.user?.name;
    const name = n
      ? `${n.firstName ?? ''} ${n.lastName ?? ''}`.trim() || undefined
      : undefined;
    return { idToken, name };
  }

  // ── Internals ───────────────────────────────────────────────────────────────

  private get win(): OAuthWindow {
    return window as unknown as OAuthWindow;
  }

  /** Inject a third-party script once; resolve when `ready()` is satisfied. */
  private loadScript(src: string, ready: () => boolean): Promise<void> {
    if (ready()) return Promise.resolve();

    const existing = this.scripts.get(src);
    if (existing) return existing;

    const promise = new Promise<void>((resolve, reject) => {
      const el = document.createElement('script');
      el.src = src;
      el.async = true;
      el.defer = true;
      el.onload = () => {
        // The SDK may attach its global slightly after onload.
        const start = Date.now();
        const poll = () => {
          if (ready()) return resolve();
          if (Date.now() - start > 5000) return reject(new Error(`Timed out loading ${src}`));
          setTimeout(poll, 50);
        };
        poll();
      };
      el.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(el);
    });

    this.scripts.set(src, promise);
    return promise;
  }
}
