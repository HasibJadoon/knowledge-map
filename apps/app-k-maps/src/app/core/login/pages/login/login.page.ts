import { HttpClient } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  ViewChild,
  inject,
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import gsap from 'gsap';
import { isTokenValid } from '../../../auth/auth.utils';
import { OAuthService } from '../../../auth/oauth.service';
import { environment } from '../../../../../environments/environment';

type LoginResponse = {
  ok?: boolean;
  data?: { token?: string; expires_in?: number };
  error?: { code?: string; message?: string };
};

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage implements AfterViewInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly oauth = inject(OAuthService);
  private readonly zone = inject(NgZone);

  @ViewChild('brand') brand?: ElementRef<HTMLElement>;
  @ViewChild('card') card?: ElementRef<HTMLElement>;
  @ViewChild('foot') foot?: ElementRef<HTMLElement>;
  @ViewChild('googleBtn') googleBtn?: ElementRef<HTMLElement>;

  private readonly apiBase = environment.apiBase;
  private readonly tokenKey = 'auth_token';

  // Ambient particle indices — mirrors the home screen's gold motes.
  readonly particles = Array.from({ length: 14 }, (_, i) => i);

  errorMessage = '';
  loading = false;

  googleEnabled = false;
  appleEnabled = false;
  oauthBusy = false;
  private googleRendered = false;
  private animated = false;

  form = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  ngAfterViewInit(): void {
    this.runEntrance();
  }

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

    void this.oauth.loadConfig().then((config) => {
      this.googleEnabled = config.google.enabled;
      this.appleEnabled = config.apple.enabled;
      this.tryRenderGoogle();
    });
  }

  ionViewDidEnter(): void {
    this.runEntrance();
    this.tryRenderGoogle();
  }

  /** GSAP entrance timeline — emblem, wordmark, then the card lifts in. */
  private runEntrance(): void {
    if (this.animated || !this.brand || !this.card) return;
    this.animated = true;

    const brandKids = gsap.utils.toArray<HTMLElement>(
      this.brand.nativeElement.children,
    );
    const cardKids = gsap.utils.toArray<HTMLElement>(
      this.card.nativeElement.querySelectorAll('.login__anim'),
    );

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from(brandKids, {
      opacity: 0,
      y: 24,
      scale: 0.82,
      filter: 'blur(8px)',
      duration: 0.8,
      stagger: 0.12,
      clearProps: 'filter,scale',
    })
      .fromTo(
        this.card.nativeElement,
        { opacity: 0, y: 46, filter: 'blur(12px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.85, clearProps: 'filter' },
        '-=0.45',
      )
      .from(
        cardKids,
        { opacity: 0, y: 18, duration: 0.5, stagger: 0.075 },
        '-=0.5',
      );

    if (this.foot) {
      tl.from(this.foot.nativeElement, { opacity: 0, duration: 0.6 }, '-=0.25');
    }
  }

  private tryRenderGoogle(): void {
    if (!this.googleEnabled || this.googleRendered || !this.googleBtn) return;
    this.googleRendered = true;
    void this.oauth
      .renderGoogleButton(this.googleBtn.nativeElement, (idToken) =>
        this.zone.run(() => this.exchangeOAuth('google', idToken)),
      )
      .catch(() => {
        this.googleRendered = false;
        this.googleEnabled = false;
      });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.shakeCard();
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
          this.completeLogin(token);
          return;
        }

        this.fail(response.error?.message || 'Login failed');
      },
      error: (error) => {
        if (error?.status === 401) {
          localStorage.removeItem(this.tokenKey);
        }
        this.fail(error?.error?.error?.message || 'Login failed');
      },
    });
  }

  async appleSignIn(): Promise<void> {
    if (this.oauthBusy) return;
    this.errorMessage = '';
    this.oauthBusy = true;
    try {
      const { idToken, name } = await this.oauth.signInWithApple();
      this.exchangeOAuth('apple', idToken, name);
    } catch (e) {
      this.oauthBusy = false;
      this.fail(e instanceof Error ? e.message : 'Apple sign-in failed');
    }
  }

  /** Trade a provider ID token for a K-MAPS session token. */
  private exchangeOAuth(provider: 'google' | 'apple', idToken: string, name?: string): void {
    this.errorMessage = '';
    this.oauthBusy = true;
    const body: Record<string, string> = { id_token: idToken };
    if (name) body['name'] = name;

    this.http
      .post<LoginResponse>(`${this.apiBase}/core/auth/oauth/${provider}`, body)
      .subscribe({
        next: (response) => {
          const token = response.data?.token;
          if (response.ok && token) {
            this.completeLogin(token);
            return;
          }
          this.oauthBusy = false;
          this.fail(response.error?.message || 'Sign-in failed');
        },
        error: (error) => {
          this.oauthBusy = false;
          this.fail(error?.error?.error?.message || 'Sign-in failed. Please try again.');
        },
      });
  }

  private completeLogin(token: string): void {
    localStorage.setItem(this.tokenKey, token);
    this.loading = false;
    this.oauthBusy = false;

    const target = this.card?.nativeElement;
    if (target) {
      gsap.to(target, {
        opacity: 0,
        y: -28,
        scale: 0.96,
        filter: 'blur(8px)',
        duration: 0.4,
        ease: 'power2.in',
        onComplete: () => {
          void this.router.navigateByUrl('/home', { replaceUrl: true });
        },
      });
    } else {
      void this.router.navigateByUrl('/home', { replaceUrl: true });
    }
  }

  private fail(message: string): void {
    this.errorMessage = message;
    this.loading = false;
    this.shakeCard();
  }

  private shakeCard(): void {
    const target = this.card?.nativeElement;
    if (target) {
      gsap.fromTo(
        target,
        { x: -9 },
        { x: 0, duration: 0.55, ease: 'elastic.out(1, 0.35)' },
      );
    }
  }
}
