import {
  ChangeDetectionStrategy, Component, ElementRef, HostListener,
  Input, OnDestroy, ViewChild, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';

import {
  WorldviewLibraryApiService,
  WvIllustrationSummary,
} from '../../services/worldview/worldview-library-api.service';

interface IllustrationView {
  id: string;
  title: string;
  caption: string;
  doc: SafeHtml;     // full standalone HTML document, sandboxed in an iframe
}

// ─── Worldview source-unit illustrations ──────────────────────────────────────
// A toolbar icon (visible only when the selected unit has illustrations) that
// opens a full-screen modal viewer. The 1..N visual HTML pages are shown one at
// a time and swiped between (CSS scroll-snap). The overlay is teleported to
// <body> on open so position:fixed resolves against the viewport — never trapped
// by a transformed/contained ancestor (e.g. a header/toolbar).
@Component({
  selector: 'km-wv-illustrations',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    @if (items().length) {
      <button
        type="button"
        class="wvi-trigger"
        (click)="open()"
        [title]="triggerLabel()"
        [attr.aria-label]="triggerLabel()"
      >
        <svg class="wvi-trigger__icon" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="4.5" width="18" height="15" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.6"/>
          <circle cx="8.5" cy="9.5" r="1.7" fill="currentColor"/>
          <path d="M4 17l4.5-4.5 3 3 3.5-4.5 5 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
        </svg>
        @if (items().length > 1) {
          <span class="wvi-trigger__badge">{{ items().length }}</span>
        }
      </button>

      @if (isOpen()) {
        <div class="wvi-modal" #overlay role="dialog" aria-modal="true" aria-label="Illustrations" (click)="onBackdrop($event)">
          <div class="wvi-modal__panel">
            <div class="wvi-modal__bar">
              <span class="wvi-modal__count">{{ current() + 1 }} / {{ items().length }}</span>
              <span class="wvi-modal__title">{{ items()[current()]?.title }}</span>
              <button type="button" class="wvi-modal__close" (click)="close()" aria-label="Close">✕</button>
            </div>

            <div class="wvi-track" #track (scroll)="onScroll()">
              @for (it of items(); track it.id) {
                <div class="wvi-slide">
                  <iframe
                    class="wvi-frame"
                    [srcdoc]="$any(it.doc)"
                    sandbox="allow-same-origin"
                    referrerpolicy="no-referrer"
                    [title]="it.title || 'Illustration'"
                  ></iframe>
                </div>
              }
            </div>

            @if (items().length > 1) {
              <button type="button" class="wvi-arrow wvi-arrow--prev" (click)="go(-1)" [disabled]="current() === 0" aria-label="Previous">‹</button>
              <button type="button" class="wvi-arrow wvi-arrow--next" (click)="go(1)" [disabled]="current() === items().length - 1" aria-label="Next">›</button>
              <div class="wvi-dots">
                @for (it of items(); track it.id; let i = $index) {
                  <button
                    type="button"
                    class="wvi-dot"
                    [class.wvi-dot--on]="i === current()"
                    (click)="goTo(i)"
                    [attr.aria-label]="'Go to illustration ' + (i + 1)"
                  ></button>
                }
              </div>
            }
          </div>
        </div>
      }
    }
  `,
  styles: [`
    .wvi-trigger {
      position: relative; display: inline-flex; align-items: center; justify-content: center;
      width: 2.1rem; height: 2.1rem; padding: 0; cursor: pointer;
      background: transparent; border: 0; color: var(--km-text-gold, #c9a84c);
      border-radius: 8px; transition: background .15s ease;
    }
    .wvi-trigger:hover { background: var(--km-gold-glow, rgba(201,168,76,.14)); }
    .wvi-trigger__icon { width: 1.25rem; height: 1.25rem; display: block; }
    .wvi-trigger__badge {
      position: absolute; top: -3px; right: -3px; min-width: 15px; height: 15px; padding: 0 3px;
      font-size: 9px; font-weight: 700; line-height: 15px; text-align: center;
      color: #080808; background: var(--km-gold, #c9a84c); border-radius: 8px;
    }

    .wvi-modal {
      position: fixed; inset: 0; z-index: 100000; display: flex; align-items: center; justify-content: center;
      padding: clamp(12px, 3vw, 40px); background: rgba(0,0,0,.74); backdrop-filter: blur(3px);
    }
    .wvi-modal__panel {
      position: relative; display: flex; flex-direction: column;
      width: min(960px, 96vw); height: min(90vh, 1100px);
      background: var(--km-surface, #0d0d0d);
      border: 1px solid var(--km-border-gold, rgba(201,168,76,.3));
      border-radius: var(--km-radius, 14px); overflow: hidden;
      box-shadow: 0 24px 80px rgba(0,0,0,.6);
    }
    .wvi-modal__bar {
      display: flex; align-items: center; gap: .75rem; padding: .6rem .85rem;
      border-bottom: 1px solid var(--km-border, rgba(255,255,255,.08)); flex: 0 0 auto;
    }
    .wvi-modal__count {
      font-size: 11px; letter-spacing: .12em; font-weight: 700;
      color: var(--km-text-gold, #c9a84c); font-variant-numeric: tabular-nums;
    }
    .wvi-modal__title {
      flex: 1 1 auto; min-width: 0; font-size: 13px; color: var(--km-text-2, rgba(255,255,255,.6));
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .wvi-modal__close {
      flex: 0 0 auto; width: 28px; height: 28px; border: 0; border-radius: 7px; cursor: pointer;
      background: transparent; color: var(--km-text-2, rgba(255,255,255,.6)); font-size: 14px;
    }
    .wvi-modal__close:hover { background: rgba(255,255,255,.08); color: #fff; }

    .wvi-track {
      flex: 1 1 auto; display: flex; overflow-x: auto; overflow-y: hidden;
      scroll-snap-type: x mandatory; scroll-behavior: smooth; -webkit-overflow-scrolling: touch;
    }
    .wvi-track::-webkit-scrollbar { display: none; }
    .wvi-slide { flex: 0 0 100%; width: 100%; height: 100%; scroll-snap-align: center; }
    .wvi-frame { width: 100%; height: 100%; border: 0; background: #080808; display: block; }

    .wvi-arrow {
      position: absolute; top: 50%; transform: translateY(-50%); width: 40px; height: 40px;
      display: flex; align-items: center; justify-content: center; cursor: pointer;
      border: 1px solid var(--km-border, rgba(255,255,255,.12)); border-radius: 50%;
      background: rgba(13,13,13,.82); color: var(--km-text, rgba(255,255,255,.92)); font-size: 22px; line-height: 1;
    }
    .wvi-arrow--prev { left: 10px; }
    .wvi-arrow--next { right: 10px; }
    .wvi-arrow:disabled { opacity: .28; cursor: default; }

    .wvi-dots { position: absolute; left: 0; right: 0; bottom: 10px; display: flex; gap: 7px; justify-content: center; }
    .wvi-dot { width: 7px; height: 7px; padding: 0; border: 0; border-radius: 50%; cursor: pointer; background: rgba(255,255,255,.28); }
    .wvi-dot--on { background: var(--km-gold, #c9a84c); }
  `],
})
export class WvIllustrationsComponent implements OnDestroy {
  private readonly api = inject(WorldviewLibraryApiService);
  private readonly sanitizer = inject(DomSanitizer);

  @ViewChild('overlay') private overlayRef?: ElementRef<HTMLElement>;
  @ViewChild('track') private trackRef?: ElementRef<HTMLElement>;

  readonly items = signal<IllustrationView[]>([]);
  readonly isOpen = signal(false);
  readonly current = signal(0);
  private token = 0;

  /** The source unit whose illustrations to show. */
  @Input() set unitId(value: string | null | undefined) {
    void this.load(value ?? null);
  }

  triggerLabel(): string {
    const n = this.items().length;
    return `View ${n} illustration${n === 1 ? '' : 's'}`;
  }

  ngOnDestroy(): void {
    this.restoreScroll();
    this.overlayRef?.nativeElement?.remove();
  }

  private async load(id: string | null): Promise<void> {
    const mine = ++this.token;
    this.close();
    if (!id) { this.items.set([]); return; }

    let summaries: WvIllustrationSummary[] = [];
    try {
      summaries = await firstValueFrom(this.api.listUnitIllustrations(id));
    } catch { summaries = []; }
    if (mine !== this.token) return;
    if (!summaries.length) { this.items.set([]); return; }

    // The list endpoint omits html_content; fetch each document for the iframe.
    const details = await Promise.all(
      summaries.map((s) => firstValueFrom(this.api.getIllustration(s.id)).catch(() => null)),
    );
    if (mine !== this.token) return;

    const views: IllustrationView[] = [];
    details.forEach((detail, i) => {
      if (!detail?.html_content) return;
      const s = summaries[i];
      views.push({
        id: s.id,
        title: s.title ?? '',
        caption: s.caption ?? '',
        doc: this.sanitizer.bypassSecurityTrustHtml(detail.html_content),
      });
    });
    this.items.set(views);
  }

  open(): void {
    if (!this.items().length) return;
    this.current.set(0);
    this.isOpen.set(true);
    if (typeof document !== 'undefined') document.body.style.overflow = 'hidden';
    // Teleport the overlay to <body> so position:fixed is viewport-relative,
    // then jump to the first slide — both after the overlay has rendered.
    setTimeout(() => {
      const el = this.overlayRef?.nativeElement;
      if (el && el.parentElement !== document.body) document.body.appendChild(el);
      this.trackRef?.nativeElement?.scrollTo({ left: 0 });
    }, 0);
  }

  close(): void {
    this.isOpen.set(false);
    this.restoreScroll();
  }

  private restoreScroll(): void {
    if (typeof document !== 'undefined') document.body.style.overflow = '';
  }

  onBackdrop(event: MouseEvent): void {
    if ((event.target as HTMLElement)?.classList?.contains('wvi-modal')) this.close();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen()) this.close();
  }

  go(delta: number): void {
    this.goTo(this.current() + delta);
  }

  goTo(index: number): void {
    const max = this.items().length - 1;
    const next = Math.max(0, Math.min(max, index));
    const track = this.trackRef?.nativeElement;
    if (track) track.scrollTo({ left: next * track.clientWidth, behavior: 'smooth' });
    this.current.set(next);
  }

  onScroll(): void {
    const track = this.trackRef?.nativeElement;
    if (!track || !track.clientWidth) return;
    const index = Math.round(track.scrollLeft / track.clientWidth);
    if (index !== this.current()) this.current.set(index);
  }
}
