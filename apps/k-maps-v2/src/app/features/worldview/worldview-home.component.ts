import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import gsap from 'gsap';

interface StatCounter {
  label: string;
  key: string;
  value: number;
  target: number;
  display: string;
}

interface FeatureCard {
  glyph: string;
  title: string;
  desc: string;
  route: string;
  tag: string;
}

@Component({
  selector: 'km-worldview-home',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wvh" #page>

      <!-- Particles -->
      <div class="wvh__particles" aria-hidden="true">
        @for (p of particles; track p) {
          <span class="particle" [style.--i]="p"></span>
        }
      </div>

      <!-- Back Button -->
      <a class="wvh__back" [routerLink]="['/landing']">
        <span class="wvh__back-arrow">←</span>
        <span class="wvh__back-label">Home</span>
      </a>

      <div class="wvh__inner">

        <!-- Header -->
        <header class="wvh__header" #header>
          <p class="wvh__eyebrow">Knowledge Research Engine</p>
          <h1 class="wvh__title">Worldview</h1>
          <p class="wvh__subtitle">Sources · Comparisons · Research</p>
          <div class="wvh__rule"></div>
        </header>

        <!-- Stats Row -->
        <div class="wvh__stats" #statsRow>
          @for (stat of stats(); track stat.key) {
            <div class="wvh__stat">
              <span class="wvh__stat-value" [attr.data-key]="stat.key">{{ stat.display }}</span>
              <span class="wvh__stat-label">{{ stat.label }}</span>
            </div>
          }
        </div>

        <!-- Feature Cards -->
        <div class="wvh__cards">
          @for (card of cards; track card.route) {
            <a class="wvh__card" [routerLink]="[card.route]" #cardEl>
              <div class="wvh__card-glow"></div>
              <div class="wvh__card-tag">{{ card.tag }}</div>
              <div class="wvh__card-glyph">{{ card.glyph }}</div>
              <h2 class="wvh__card-title">{{ card.title }}</h2>
              <p class="wvh__card-desc">{{ card.desc }}</p>
              <div class="wvh__card-arrow">→</div>
            </a>
          }
        </div>

      </div>
    </div>
  `,
  styles: [`
    .wvh {
      position: relative;
      width: 100%;
      min-height: 100dvh;
      background: radial-gradient(ellipse 80% 60% at 50% 30%, #0e0d05 0%, #080808 60%, #000 100%);
      color: var(--km-text);
      font-family: var(--km-font-body);
      overflow-x: hidden;
      overflow-y: auto;

      &__particles {
        position: fixed;
        inset: 0;
        pointer-events: none;
        overflow: hidden;
        z-index: 0;
      }

      &__back {
        position: fixed;
        top: 1.4rem;
        left: 1.4rem;
        z-index: 100;
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        padding: 0.5rem 1rem 0.5rem 0.75rem;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid var(--km-border);
        border-radius: 8px;
        color: var(--km-text-2);
        font-family: var(--km-font-body);
        font-size: 0.75rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        text-decoration: none;
        cursor: pointer;
        transition: border-color 0.2s, color 0.2s, background 0.2s;

        &:hover {
          border-color: var(--km-border-gold);
          color: var(--km-gold);
          background: rgba(201, 168, 76, 0.06);
        }

        &-arrow { font-size: 0.9rem; }
        &-label { font-weight: 500; }
      }

      &__inner {
        position: relative;
        z-index: 1;
        max-width: 1100px;
        margin: 0 auto;
        padding: 7rem 2rem 5rem;
      }

      &__header {
        text-align: center;
        margin-bottom: 3.5rem;
      }

      &__eyebrow {
        font-size: 0.7rem;
        font-weight: 600;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: var(--km-gold);
        opacity: 0.7;
        margin-bottom: 0.75rem;
      }

      &__title {
        font-family: var(--km-font-heading);
        font-size: clamp(3rem, 7vw, 5.5rem);
        font-weight: 700;
        letter-spacing: 0.1em;
        line-height: 1;
        background: linear-gradient(135deg, var(--km-gold-bright) 0%, var(--km-gold) 55%, #8a6e2a 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin-bottom: 1rem;
        filter: drop-shadow(0 0 30px rgba(201, 168, 76, 0.25));
      }

      &__subtitle {
        font-size: 0.9rem;
        color: var(--km-text-2);
        letter-spacing: 0.06em;
        margin-bottom: 2rem;
      }

      &__rule {
        width: 60px;
        height: 1px;
        background: linear-gradient(90deg, transparent, var(--km-gold), transparent);
        margin: 0 auto;
      }

      /* Stats */
      &__stats {
        display: flex;
        gap: 1rem;
        justify-content: center;
        flex-wrap: wrap;
        margin-bottom: 4rem;
      }

      &__stat {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25rem;
        padding: 1.25rem 2rem;
        background: rgba(255, 255, 255, 0.025);
        border: 1px solid var(--km-border);
        border-radius: 12px;
        min-width: 120px;
        transition: border-color 0.25s, box-shadow 0.25s;

        &:hover {
          border-color: var(--km-border-gold);
          box-shadow: 0 0 20px rgba(201, 168, 76, 0.08);
        }
      }

      &__stat-value {
        font-family: var(--km-font-heading);
        font-size: 2rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        background: linear-gradient(135deg, var(--km-gold-bright), var(--km-gold));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        line-height: 1;
      }

      &__stat-label {
        font-size: 0.65rem;
        font-weight: 600;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--km-text-3);
      }

      /* Feature Cards */
      &__cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1.5rem;
      }

      &__card {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        padding: 2.25rem 2rem 1.75rem;
        background: rgba(255, 255, 255, 0.025);
        border: 1px solid var(--km-border);
        border-radius: 18px;
        text-decoration: none;
        color: inherit;
        cursor: pointer;
        overflow: hidden;
        transition: border-color 0.3s, box-shadow 0.3s, transform 0.3s;

        &:hover {
          border-color: var(--km-border-gold);
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(201, 168, 76, 0.14);

          .wvh__card-glow { opacity: 1; }
          .wvh__card-arrow { opacity: 1; transform: translateX(4px); }
          .wvh__card-glyph { filter: drop-shadow(0 0 20px rgba(201, 168, 76, 0.5)); }
        }
      }

      &__card-glow {
        position: absolute;
        inset: 0;
        border-radius: 18px;
        background: radial-gradient(ellipse at 20% 20%, rgba(201, 168, 76, 0.06) 0%, transparent 60%);
        opacity: 0;
        transition: opacity 0.35s;
        pointer-events: none;
      }

      &__card-tag {
        font-size: 0.62rem;
        font-weight: 700;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: var(--km-gold);
        opacity: 0.6;
      }

      &__card-glyph {
        font-size: 2.8rem;
        line-height: 1;
        background: linear-gradient(180deg, var(--km-gold-bright) 0%, var(--km-gold) 60%, #7a6432 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        transition: filter 0.3s;
      }

      &__card-title {
        font-family: var(--km-font-heading);
        font-size: 1.35rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        color: var(--km-text);
        margin: 0;
      }

      &__card-desc {
        font-size: 0.85rem;
        color: var(--km-text-2);
        line-height: 1.65;
        margin: 0;
        flex: 1;
      }

      &__card-arrow {
        align-self: flex-end;
        font-size: 1.1rem;
        color: var(--km-gold);
        opacity: 0;
        transition: opacity 0.25s, transform 0.25s;
        margin-top: 0.5rem;
      }
    }

    /* Particles */
    .particle {
      position: absolute;
      width: 2px;
      height: 2px;
      border-radius: 50%;
      background: var(--km-gold);
      opacity: 0;
      animation: floatParticle calc(8s + var(--i, 0) * 1.3s) infinite linear;
      left: calc(var(--i, 0) * 6.5% + 5%);
      top: 100%;
      animation-delay: calc(var(--i, 0) * 0.6s);
    }

    @keyframes floatParticle {
      0%   { transform: translateY(0) scale(1); opacity: 0; }
      10%  { opacity: 0.6; }
      80%  { opacity: 0.15; }
      100% { transform: translateY(-100vh) scale(0.3); opacity: 0; }
    }
  `],
})
export class WorldviewHomeComponent implements OnInit, AfterViewInit {
  @ViewChild('header') headerRef!: ElementRef<HTMLElement>;
  @ViewChild('statsRow') statsRowRef!: ElementRef<HTMLElement>;
  @ViewChild('page') pageRef!: ElementRef<HTMLElement>;

  readonly particles = Array.from({ length: 15 }, (_, i) => i);

  readonly stats = signal<StatCounter[]>([
    { label: 'Sources', key: 'sources', value: 0, target: 0, display: '—' },
    { label: 'Highlights', key: 'highlights', value: 0, target: 0, display: '—' },
    { label: 'Sessions', key: 'brainstorm', value: 0, target: 0, display: '—' },
    { label: 'Comparisons', key: 'comparisons', value: 0, target: 0, display: '—' },
  ]);

  readonly cards: FeatureCard[] = [
    {
      glyph: '§',
      title: 'Library',
      desc: 'Source library — books, notes, highlights and distillations across all your reading.',
      route: '/worldview/library',
      tag: 'Sources',
    },
    {
      glyph: '↔',
      title: 'Comparison',
      desc: 'Parallel scripture comparison across traditions — side-by-side tab analysis.',
      route: '/worldview/compare',
      tag: 'Analysis',
    },
    {
      glyph: '⚡',
      title: 'Brainstorm',
      desc: 'Free-form research journal and idea capture — session-based thinking space.',
      route: '/worldview/brainstorm',
      tag: 'Research',
    },
  ];

  ngOnInit(): void {
    void this.loadCounts();
  }

  ngAfterViewInit(): void {
    this.runEntryAnimation();
  }

  private async loadCounts(): Promise<void> {
    try {
      const res = await fetch('/hub/counts');
      if (!res.ok) return;
      const data = await res.json() as { ok: boolean; counts: Record<string, number> };
      if (!data.ok || !data.counts) return;

      const c = data.counts;
      const current = this.stats();
      const updated = current.map(s => ({
        ...s,
        target: c[s.key] ?? 0,
        display: String(c[s.key] ?? 0),
      }));
      this.stats.set(updated);
      this.animateCounts(updated);
    } catch {
      // silently ignore
    }
  }

  private animateCounts(stats: StatCounter[]): void {
    stats.forEach(stat => {
      if (stat.target === 0) return;
      const el = document.querySelector(`[data-key="${stat.key}"]`);
      if (!el) return;
      const obj = { val: 0 };
      gsap.to(obj, {
        val: stat.target,
        duration: 1.6,
        ease: 'power2.out',
        delay: 0.6,
        onUpdate: () => { el.textContent = Math.round(obj.val).toLocaleString(); },
      });
    });
  }

  private runEntryAnimation(): void {
    gsap.fromTo(
      this.headerRef.nativeElement,
      { opacity: 0, y: -28, filter: 'blur(4px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.9, ease: 'power3.out', clearProps: 'filter' }
    );

    gsap.fromTo(
      this.statsRowRef.nativeElement.querySelectorAll('.wvh__stat'),
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out', stagger: 0.1, delay: 0.3 }
    );

    gsap.fromTo(
      '.wvh__card',
      { opacity: 0, y: 40, scale: 0.95 },
      {
        opacity: 1, y: 0, scale: 1,
        duration: 0.6, ease: 'power3.out',
        stagger: 0.12, delay: 0.5,
        clearProps: 'transform',
      }
    );
  }
}
