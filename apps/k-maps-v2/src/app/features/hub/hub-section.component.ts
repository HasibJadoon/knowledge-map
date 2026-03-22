import {
  Component, ChangeDetectionStrategy, AfterViewInit,
  inject, signal, computed, OnInit
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import gsap from 'gsap';
import { HubCardComponent } from './hub-card.component';
import { HubPanelComponent } from './hub-panel.component';
import { HubPanelService } from './hub-panel.service';
import { HubCard } from './models/hub.models';
import { QURAN_CARDS } from './cards/quran.cards';
import { ARABIC_CARDS } from './cards/arabic.cards';
import { WORLDVIEW_CARDS } from './cards/worldview.cards';
import { WORKSPACE_CARDS } from './cards/workspace.cards';

const CARD_MAP: Record<string, HubCard[]> = {
  quran: QURAN_CARDS,
  arabic: ARABIC_CARDS,
  worldview: WORLDVIEW_CARDS,
  workspace: WORKSPACE_CARDS,
};

const SECTION_META: Record<string, { title: string; subtitle: string; glyph: string; tag: string }> = {
  quran:     { title: 'Quran',     subtitle: 'Scripture Management',      glyph: '☽', tag: 'SCRIPTURE' },
  arabic:    { title: 'Arabic',    subtitle: 'Language & Linguistics',     glyph: 'ع', tag: 'LANGUAGE' },
  worldview: { title: 'Worldview', subtitle: 'Knowledge & Research',       glyph: '◎', tag: 'KNOWLEDGE' },
  workspace: { title: 'Workspace', subtitle: 'Collaboration & Projects',   glyph: '⊞', tag: 'EXECUTION' },
};

@Component({
  selector: 'km-hub-section',
  standalone: true,
  imports: [CommonModule, HubCardComponent, HubPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="hs">
      <!-- Section header -->
      <header class="hs__header">
        <button class="hs__back" (click)="goBack()">
          <span>←</span> Hub
        </button>
        <div class="hs__meta">
          <span class="hs__meta-glyph">{{ meta()!.glyph }}</span>
          <div>
            <p class="hs__eyebrow">{{ meta()!.tag }}</p>
            <h1 class="hs__title">{{ meta()!.title }}</h1>
            <p class="hs__subtitle">{{ meta()!.subtitle }}</p>
          </div>
        </div>
        <div class="hs__rule"></div>
      </header>

      <!-- Cards grid -->
      <main class="hs__grid">
        @for (card of cards(); track card.id) {
          <km-hub-card
            [card]="card"
            [count]="card.countKey ? counts()[card.countKey] : null"
            [showDesc]="true"
            (cardClick)="openCard($event)"
          />
        }
      </main>
    </div>

    <!-- Panel -->
    <km-hub-panel />
  `,
  styles: [`
    .hs {
      width: 100%; min-height: 100%;
      padding: 2rem;
      background: var(--km-bg);
    }

    .hs__header {
      max-width: 1100px; margin: 0 auto 2.5rem;
    }

    .hs__back {
      display: inline-flex; align-items: center; gap: .4rem;
      background: rgba(255,255,255,.04); border: 1px solid var(--km-border);
      border-radius: 8px; color: var(--km-text-2); padding: .45rem .9rem;
      font-size: .75rem; letter-spacing: .06em; text-transform: uppercase;
      cursor: pointer; margin-bottom: 1.5rem;
      transition: border-color .2s, color .2s;
      &:hover { border-color: var(--km-border-gold); color: var(--km-gold); }
    }

    .hs__meta {
      display: flex; align-items: center; gap: 1.2rem; margin-bottom: 1.5rem;
    }

    .hs__meta-glyph {
      font-size: 3rem; line-height: 1;
      background: linear-gradient(180deg, #c9a84c 0%, #6b5520 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      font-family: var(--km-font-arabic, inherit);
      filter: drop-shadow(0 0 12px rgba(201,168,76,.3));
    }

    .hs__eyebrow {
      font-size: .65rem; font-weight: 700; letter-spacing: .22em; text-transform: uppercase;
      color: var(--km-gold); opacity: .65; margin-bottom: .3rem;
    }

    .hs__title {
      font-family: var(--km-font-heading);
      font-size: clamp(1.8rem, 4vw, 3rem); font-weight: 700; letter-spacing: .06em; line-height: 1;
      background: linear-gradient(135deg, var(--km-gold-bright) 0%, var(--km-gold) 55%, #a07830 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      margin-bottom: .3rem;
    }

    .hs__subtitle { font-size: .88rem; color: var(--km-text-2); }

    .hs__rule {
      width: 48px; height: 1px;
      background: linear-gradient(90deg, transparent, var(--km-gold), transparent);
    }

    .hs__grid {
      max-width: 1100px; margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 1.2rem;
    }
  `]
})
export class HubSectionComponent implements OnInit, AfterViewInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  readonly panel = inject(HubPanelService);

  readonly section = signal<string>('');
  readonly counts = signal<Record<string, number>>({});

  readonly cards = computed(() => CARD_MAP[this.section()] ?? []);
  readonly meta = computed(() => SECTION_META[this.section()]);

  ngOnInit(): void {
    const s = this.route.snapshot.data['section'] as string;
    this.section.set(s);
    this.loadCounts();
  }

  ngAfterViewInit(): void {
    gsap.fromTo('.hs__header',
      { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: .6, ease: 'power3.out' }
    );
    gsap.fromTo('km-hub-card',
      { opacity: 0, y: 28, scale: .95 },
      { opacity: 1, y: 0, scale: 1, duration: .5, stagger: .07, ease: 'power3.out', clearProps: 'transform', delay: .2 }
    );
  }

  private async loadCounts(): Promise<void> {
    try {
      const res = await fetch('/hub/counts');
      const data = await res.json() as { ok: boolean; counts: Record<string, number> };
      if (data.ok) this.counts.set(data.counts);
    } catch { /* silent */ }
  }

  openCard(card: HubCard): void {
    this.router.navigate([card.route], { relativeTo: this.route });
  }

  goBack(): void {
    this.router.navigate(['/hub']);
  }
}
