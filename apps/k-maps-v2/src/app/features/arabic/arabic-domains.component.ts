import {
  Component,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface ArDomain {
  id: number | string;
  name_ar?: string;
  name?: string;
  name_en?: string;
  icon?: string;
  description?: string;
}

interface ArPhrase {
  id: number | string;
  arabic?: string;
  text_ar?: string;
  transliteration?: string;
  english?: string;
  text_en?: string;
  translation?: string;
  level?: string;
}

@Component({
  selector: 'km-arabic-domains',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="dom-page">
      <div class="dom-page__inner">

        <!-- Nav -->
        <nav class="dom-nav">
          <button class="back-btn" (click)="back()">&#8592; Arabic</button>
          <span class="dom-nav__crumb">Domains</span>
          @if (activeDomain()) {
            <span class="dom-nav__sep">›</span>
            <span class="dom-nav__domain">{{ activeDomain()!.name_ar ?? activeDomain()!.name }}</span>
          }
        </nav>

        <!-- Header -->
        @if (!activeDomain()) {
          <header class="dom-header">
            <span class="dom-header__ar">المجالات</span>
            <h1 class="dom-header__title">Domains</h1>
            <p class="dom-header__sub">Context-specific vocabulary across real-life situations</p>
          </header>
        }

        <!-- Domain grid -->
        @if (!activeDomain()) {
          @if (domainsLoading()) {
            <div class="domain-grid">
              @for (s of skeletons; track s) {
                <div class="skeleton-domain"></div>
              }
            </div>
          }
          @if (!domainsLoading() && domains().length === 0) {
            <div class="empty-state">
              <div class="empty-state__icon">م</div>
              <p class="empty-state__title">No domains yet</p>
              <p class="empty-state__sub">Add domains via the Hub to build your vocabulary domains.</p>
            </div>
          }
          @if (!domainsLoading() && domains().length > 0) {
            <div class="domain-grid">
              @for (d of domains(); track d.id) {
                <button class="domain-card" (click)="openDomain(d)">
                  <div class="domain-card__icon">{{ d.icon ?? domainIcon(d) }}</div>
                  <div class="domain-card__ar">{{ d.name_ar ?? d.name }}</div>
                  <div class="domain-card__en">{{ d.name_en ?? d.name }}</div>
                </button>
              }
            </div>
          }
        }

        <!-- Phrase view -->
        @if (activeDomain()) {
          <div class="phrase-view">
            <div class="phrase-view__header">
              <button class="back-domain-btn" (click)="closeDomain()">&#8592; All Domains</button>
              <div class="phrase-view__title-block">
                <span class="phrase-view__ar">{{ activeDomain()!.name_ar ?? activeDomain()!.name }}</span>
                <span class="phrase-view__en">{{ activeDomain()!.name_en ?? activeDomain()!.name }}</span>
              </div>
            </div>

            @if (phrasesLoading()) {
              <div class="phrase-grid">
                @for (s of skeletons; track s) {
                  <div class="skeleton-phrase"></div>
                }
              </div>
            }
            @if (!phrasesLoading() && phrases().length === 0) {
              <div class="empty-state">
                <div class="empty-state__icon">م</div>
                <p class="empty-state__title">No phrases yet</p>
                <p class="empty-state__sub">No phrases have been added to this domain.</p>
              </div>
            }
            @if (!phrasesLoading() && phrases().length > 0) {
              <div class="phrase-grid">
                @for (p of phrases(); track p.id) {
                  <div class="phrase-card">
                    <div class="phrase-card__arabic">{{ p.arabic ?? p.text_ar }}</div>
                    @if (p.transliteration) {
                      <div class="phrase-card__translit">{{ p.transliteration }}</div>
                    }
                    <div class="phrase-card__english">{{ p.english ?? p.text_en ?? p.translation }}</div>
                    @if (p.level) {
                      <span class="badge badge--level" [attr.data-level]="p.level">{{ p.level }}</span>
                    }
                  </div>
                }
              </div>
            }
          </div>
        }

      </div>
    </div>
  `,
  styles: [`
    .dom-page {
      width: 100%; min-height: 100dvh; background: var(--km-bg);
      color: var(--km-text); font-family: var(--km-font-body);
      padding: 2rem 2rem 4rem;
    }
    .dom-page__inner { max-width: 1100px; margin: 0 auto; }

    .dom-nav {
      display: flex; align-items: center; gap: 0.75rem; margin-bottom: 2rem;
    }
    .back-btn {
      background: transparent; border: 1px solid var(--km-border); border-radius: 6px;
      color: var(--km-text-2); font-family: var(--km-font-body); font-size: 0.8rem;
      letter-spacing: 0.06em; text-transform: uppercase; padding: 0.45rem 0.9rem;
      cursor: pointer; transition: border-color 0.2s, color 0.2s;
    }
    .back-btn:hover { border-color: var(--km-border-gold); color: var(--km-gold); }
    .dom-nav__crumb {
      font-family: var(--km-font-heading); font-size: 0.75rem; letter-spacing: 0.12em;
      text-transform: uppercase; color: var(--km-gold); opacity: 0.7;
    }
    .dom-nav__sep { color: var(--km-text-3); font-size: 0.9rem; }
    .dom-nav__domain {
      font-family: var(--km-font-arabic); font-size: 1rem; color: var(--km-text-2);
      direction: rtl;
    }

    .dom-header {
      text-align: center; margin-bottom: 2.5rem;
    }
    .dom-header__ar {
      display: block; font-family: var(--km-font-arabic); font-size: 2.5rem;
      color: var(--km-gold); opacity: 0.7; direction: rtl; margin-bottom: 0.25rem;
    }
    .dom-header__title {
      font-family: var(--km-font-heading); font-size: 1.6rem; font-weight: 600;
      letter-spacing: 0.15em; text-transform: uppercase; color: var(--km-text);
      margin: 0 0 0.4rem;
    }
    .dom-header__sub {
      font-size: 0.8rem; letter-spacing: 0.1em; text-transform: uppercase;
      color: var(--km-text-3); margin: 0;
    }

    /* Domain grid */
    .domain-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 1rem;
    }
    .domain-card {
      background: rgba(255,255,255,0.025); border: 1px solid var(--km-border);
      border-radius: 12px; padding: 1.75rem 1rem 1.25rem;
      display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
      cursor: pointer; transition: border-color 0.2s, background 0.2s, transform 0.2s;
      text-align: center;
    }
    .domain-card:hover {
      border-color: var(--km-border-gold); background: rgba(201,168,76,0.05);
      transform: translateY(-2px);
    }
    .domain-card__icon {
      font-size: 2rem; line-height: 1; margin-bottom: 0.25rem;
    }
    .domain-card__ar {
      font-family: var(--km-font-arabic); font-size: 1.2rem; color: var(--km-gold);
      direction: rtl;
    }
    .domain-card__en {
      font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase;
      color: var(--km-text-3);
    }

    /* Phrase view */
    .phrase-view__header {
      display: flex; align-items: center; gap: 1.5rem; margin-bottom: 2rem;
      padding-bottom: 1.25rem; border-bottom: 1px solid var(--km-border);
    }
    .back-domain-btn {
      background: transparent; border: 1px solid var(--km-border); border-radius: 6px;
      color: var(--km-text-2); font-family: var(--km-font-body); font-size: 0.8rem;
      letter-spacing: 0.06em; text-transform: uppercase; padding: 0.4rem 0.85rem;
      cursor: pointer; white-space: nowrap; transition: border-color 0.2s, color 0.2s;
    }
    .back-domain-btn:hover { border-color: var(--km-border-gold); color: var(--km-gold); }
    .phrase-view__title-block {
      display: flex; flex-direction: column; gap: 0.15rem;
    }
    .phrase-view__ar {
      font-family: var(--km-font-arabic); font-size: 1.8rem; color: var(--km-gold);
      direction: rtl; line-height: 1.2;
    }
    .phrase-view__en {
      font-size: 0.75rem; letter-spacing: 0.1em; text-transform: uppercase;
      color: var(--km-text-3);
    }

    /* Phrase grid */
    .phrase-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 1rem;
    }
    .phrase-card {
      background: rgba(255,255,255,0.025); border: 1px solid var(--km-border);
      border-radius: 12px; padding: 1.5rem 1.5rem 1.25rem;
      display: flex; flex-direction: column; gap: 0.4rem;
      transition: border-color 0.2s;
    }
    .phrase-card:hover { border-color: var(--km-border-gold); }
    .phrase-card__arabic {
      font-family: var(--km-font-arabic); font-size: 1.6rem; color: var(--km-text);
      direction: rtl; text-align: right; line-height: 1.4;
    }
    .phrase-card__translit {
      font-size: 0.8rem; color: var(--km-text-3); font-style: italic;
    }
    .phrase-card__english {
      font-size: 0.88rem; color: var(--km-text-2); margin-top: 0.25rem; line-height: 1.5;
    }

    /* Badges */
    .badge {
      display: inline-block; font-size: 0.65rem; letter-spacing: 0.08em;
      text-transform: uppercase; padding: 0.15rem 0.5rem; border-radius: 20px;
      white-space: nowrap; align-self: flex-start; margin-top: 0.25rem;
    }
    .badge--level {
      background: rgba(255,255,255,0.06); color: var(--km-text-3); border: 1px solid var(--km-border);
    }
    .badge--level[data-level="beginner"] { background: rgba(52,211,153,0.1); color: #34d399; border-color: rgba(52,211,153,0.25); }
    .badge--level[data-level="intermediate"] { background: rgba(251,191,36,0.1); color: #fbbf24; border-color: rgba(251,191,36,0.25); }
    .badge--level[data-level="advanced"] { background: rgba(239,68,68,0.1); color: #ef4444; border-color: rgba(239,68,68,0.25); }
    .badge--level[data-level="classical"] { background: rgba(201,168,76,0.12); color: var(--km-gold); border-color: rgba(201,168,76,0.25); }

    /* Empty state */
    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 4rem 2rem; text-align: center; gap: 0.75rem;
    }
    .empty-state__icon {
      font-family: var(--km-font-arabic); font-size: 4rem; color: var(--km-gold);
      opacity: 0.2; direction: rtl;
    }
    .empty-state__title {
      font-family: var(--km-font-heading); font-size: 1rem; letter-spacing: 0.1em;
      text-transform: uppercase; color: var(--km-text-2); margin: 0;
    }
    .empty-state__sub {
      font-size: 0.82rem; color: var(--km-text-3); max-width: 320px;
      line-height: 1.6; margin: 0;
    }

    /* Skeletons */
    .skeleton-domain, .skeleton-phrase {
      border-radius: 12px; background: rgba(255,255,255,0.04);
      animation: pulse 1.4s ease-in-out infinite;
    }
    .skeleton-domain { height: 140px; }
    .skeleton-phrase { height: 160px; }
    @keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
  `],
})
export class ArabicDomainsComponent implements OnInit {
  private router = inject(Router);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private readonly base = environment.apiBase;

  domains = signal<ArDomain[]>([]);
  activeDomain = signal<ArDomain | null>(null);
  phrases = signal<ArPhrase[]>([]);
  domainsLoading = signal(true);
  phrasesLoading = signal(false);
  skeletons = [1, 2, 3, 4, 5, 6, 7, 8];

  private readonly domainIconMap: Record<string, string> = {
    home: '🏠', house: '🏠', market: '🛒', mosque: '🕌',
    travel: '✈️', food: '🍽️', family: '👨‍👩‍👧', work: '💼',
    religion: '📿', prayer: '🤲', nature: '🌿', school: '📚',
  };

  ngOnInit(): void {
    this.loadDomains();
  }

  private loadDomains(): void {
    this.http.get<any>(`${this.base}/ar/domains?limit=20`).subscribe({
      next: (res) => {
        if (res?.ok && Array.isArray(res.domains)) {
          this.domains.set(res.domains);
        }
        this.domainsLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.domainsLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  domainIcon(d: ArDomain): string {
    const name = (d.name_en ?? d.name ?? '').toLowerCase();
    for (const [key, icon] of Object.entries(this.domainIconMap)) {
      if (name.includes(key)) return icon;
    }
    return '🔤';
  }

  openDomain(d: ArDomain): void {
    this.activeDomain.set(d);
    this.phrases.set([]);
    this.phrasesLoading.set(true);
    this.http.get<any>(`${this.base}/ar/domains/${d.id}/phrases`).subscribe({
      next: (res) => {
        if (res?.ok && Array.isArray(res.phrases)) {
          this.phrases.set(res.phrases);
        }
        this.phrasesLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.phrasesLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  closeDomain(): void {
    this.activeDomain.set(null);
    this.phrases.set([]);
  }

  back(): void {
    this.router.navigate(['/arabic']);
  }
}
