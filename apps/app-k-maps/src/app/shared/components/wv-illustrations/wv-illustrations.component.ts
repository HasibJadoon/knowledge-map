import {
  ChangeDetectionStrategy, Component, ElementRef, HostListener,
  Input, ViewChild, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
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

// ─── Worldview source-unit illustrations (mobile) ─────────────────────────────
// A toolbar icon (visible only when the unit has illustrations) that opens a
// full-screen ion-modal viewer. Inside, the 1..N visual HTML pages are shown one
// at a time and the reader swipes between them (CSS scroll-snap). ion-modal is
// used (rather than a CSS overlay) so the viewer escapes the transformed
// ion-header/ion-toolbar containing block and fills the whole viewport.
@Component({
  selector: 'app-wv-illustrations',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonicModule],
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

      <ion-modal
        [isOpen]="isOpen()"
        (didDismiss)="close()"
        (didPresent)="onPresented()"
        class="wvi-ionmodal"
      >
        <ng-template>
          <div class="wvi-shell">
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
        </ng-template>
      </ion-modal>
    }
  `,
  styles: [`
    .wvi-trigger {
      position: relative; display: inline-flex; align-items: center; justify-content: center;
      width: 2.4rem; height: 2.4rem; padding: 0; cursor: pointer;
      background: transparent; border: 0; color: #c9a84c; border-radius: 8px;
    }
    .wvi-trigger__icon { width: 1.4rem; height: 1.4rem; display: block; }
    .wvi-trigger__badge {
      position: absolute; top: 1px; right: 1px; min-width: 15px; height: 15px; padding: 0 3px;
      font-size: 9px; font-weight: 700; line-height: 15px; text-align: center;
      color: #080808; background: #c9a84c; border-radius: 8px;
    }

    /* Force the modal to fill the viewport (override Ionic's card sizing on tablets/desktop). */
    .wvi-ionmodal {
      --width: 100%; --height: 100%; --max-width: 100%; --max-height: 100%;
      --border-radius: 0; --background: #0d0d0d; --box-shadow: none;
    }

    .wvi-shell {
      position: relative; display: flex; flex-direction: column;
      width: 100%; height: 100%; background: #0d0d0d;
    }
    .wvi-modal__bar {
      display: flex; align-items: center; gap: .75rem;
      padding: calc(env(safe-area-inset-top, 0px) + .65rem) .85rem .65rem;
      border-bottom: 1px solid rgba(255,255,255,.08); flex: 0 0 auto;
    }
    .wvi-modal__count {
      font-size: 11px; letter-spacing: .12em; font-weight: 700; color: #c9a84c; font-variant-numeric: tabular-nums;
    }
    .wvi-modal__title {
      flex: 1 1 auto; min-width: 0; font-size: 13px; color: rgba(255,255,255,.6);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .wvi-modal__close {
      flex: 0 0 auto; width: 32px; height: 32px; border: 0; border-radius: 7px; cursor: pointer;
      background: rgba(255,255,255,.06); color: rgba(255,255,255,.7); font-size: 15px;
    }

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
      border: 1px solid rgba(255,255,255,.14); border-radius: 50%;
      background: rgba(13,13,13,.82); color: rgba(255,255,255,.92); font-size: 22px; line-height: 1;
    }
    .wvi-arrow--prev { left: 8px; }
    .wvi-arrow--next { right: 8px; }
    .wvi-arrow:disabled { opacity: .28; }

    .wvi-dots {
      position: absolute; left: 0; right: 0; display: flex; gap: 7px; justify-content: center;
      bottom: calc(env(safe-area-inset-bottom, 0px) + 12px);
    }
    .wvi-dot { width: 7px; height: 7px; padding: 0; border: 0; border-radius: 50%; cursor: pointer; background: rgba(255,255,255,.28); }
    .wvi-dot--on { background: #c9a84c; }
  `],
})
export class WvIllustrationsComponent {
  private readonly api = inject(WorldviewLibraryApiService);
  private readonly sanitizer = inject(DomSanitizer);

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
  }

  close(): void {
    this.isOpen.set(false);
  }

  /** ion-modal finished presenting — the track exists now; jump to the first slide. */
  onPresented(): void {
    setTimeout(() => this.trackRef?.nativeElement?.scrollTo({ left: 0 }), 0);
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
