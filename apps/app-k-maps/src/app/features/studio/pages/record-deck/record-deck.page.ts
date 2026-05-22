import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, inject,
  OnDestroy, OnInit, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { StudioApiService } from '../../services/studio-api.service';
import { EpisodeAggregate } from '../../studio.models';

/** One card in the talking-head prompter — a flattened talking point. */
interface RecordCard {
  pointId: string;
  section: string;
  text: string;
  bridge: string | null;
  estSeconds: number | null;
}

interface WakeLockHandle { release?: () => void; }

@Component({
  selector: 'app-record-deck',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-content [scrollY]="false">
      <div class="rd">
        @if (loading()) {
          <div class="rd-center"><ion-spinner name="dots"></ion-spinner></div>
        } @else if (total() === 0) {
          <div class="rd-center">
            <div class="rd-bigicon">🎬</div>
            <p>No cards yet — add some in the builder first.</p>
            <button class="rd-btn" (click)="exit()">Back to builder</button>
          </div>
        } @else {
          <div class="rd-top">
            <button class="rd-x" (click)="exit()" aria-label="Exit">✕</button>
            <div class="rd-title">{{ title() }}</div>
            <div class="rd-count">
              @if (!atDoneScreen()) { {{ index() + 1 }} / {{ total() }} }
            </div>
          </div>

          @if (atDoneScreen()) {
            <div class="rd-center rd-done">
              <div class="rd-bigicon">🎬</div>
              <h1>That's a wrap</h1>
              <p>{{ capturedCount() }} of {{ total() }} cards marked captured.</p>
              <button class="rd-btn rd-btn--gold" (click)="restart()">Start over</button>
              <button class="rd-btn" (click)="exit()">Back to builder</button>
            </div>
          } @else if (currentCard(); as card) {
            <div class="rd-stage"
                 (touchstart)="onTouchStart($event)" (touchend)="onTouchEnd($event)">
              <div class="rd-meta">
                <span class="rd-section">{{ card.section }}</span>
                @if (card.estSeconds) { <span class="rd-est">~{{ card.estSeconds }}s</span> }
                @if (isCaptured()) { <span class="rd-tick">✓ captured</span> }
              </div>

              <p class="rd-text">{{ card.text || '…' }}</p>

              @if (card.bridge) {
                <div class="rd-bridge">↪ {{ card.bridge }}</div>
              }

              @if (nextCard(); as nxt) {
                <div class="rd-next">Next · {{ nxt.text || nxt.section }}</div>
              }
            </div>

            <div class="rd-foot">
              <button class="rd-nav" (click)="prev()" [disabled]="index() === 0"
                      aria-label="Previous card">‹</button>
              <div class="rd-dots">
                @for (c of cards(); track c.pointId; let i = $index) {
                  <span class="rd-dot"
                        [class.rd-dot--on]="i === index()"
                        [class.rd-dot--done]="captured().has(c.pointId)"></span>
                }
              </div>
              <button class="rd-nav rd-nav--fwd" (click)="next()"
                      aria-label="Capture and continue">›</button>
            </div>
            <div class="rd-hint">‹ swipe back · capture &amp; continue ›</div>
          }
        }
      </div>
    </ion-content>
  `,
  styles: [`
    :host { display: block; }
    ion-content { --background: radial-gradient(150% 80% at 50% 0%, #181610 0%, #08080a 60%); }

    .rd { display: flex; flex-direction: column; height: 100%; color: #f4ecd8; }
    .rd-center {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 14px; padding: 30px; text-align: center;
      color: var(--ion-color-medium);
    }
    .rd-bigicon { font-size: 3rem; }

    .rd-top {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .rd-x {
      width: 32px; height: 32px; flex-shrink: 0; border-radius: 50%;
      background: rgba(255,255,255,0.06); color: #f4ecd8; font-size: 0.9rem;
      border: 1px solid rgba(255,255,255,0.08);
    }
    .rd-title {
      flex: 1; text-align: center; font-size: 0.9rem; font-weight: 600;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .rd-count {
      min-width: 52px; text-align: right; font-size: 0.8rem;
      font-variant-numeric: tabular-nums; color: #c9a84c;
    }

    .rd-stage {
      flex: 1; display: flex; flex-direction: column; justify-content: center;
      gap: 18px; padding: 24px 26px; overflow-y: auto;
    }
    .rd-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .rd-section {
      font-size: 0.66rem; font-weight: 700; letter-spacing: 0.1em;
      text-transform: uppercase; color: var(--ion-color-medium);
    }
    .rd-est {
      font-size: 0.66rem; font-weight: 700; color: #c9a84c;
      border: 1px solid rgba(201,168,76,0.35); border-radius: 9px; padding: 1px 7px;
    }
    .rd-tick { font-size: 0.66rem; font-weight: 700; letter-spacing: 0.04em; color: #5cc94c; }
    .rd-text { margin: 0; font-size: 1.7rem; line-height: 1.4; font-weight: 600; color: #fbf6e8; }
    .rd-bridge {
      font-size: 1rem; line-height: 1.45; color: #e8c96a;
      padding-top: 14px; border-top: 1px dashed rgba(201,168,76,0.3);
    }
    .rd-next {
      font-size: 0.78rem; color: rgba(255,255,255,0.34);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }

    .rd-foot {
      display: flex; align-items: center; justify-content: space-between;
      gap: 14px; padding: 10px 18px;
    }
    .rd-nav {
      width: 52px; height: 52px; flex-shrink: 0; border-radius: 50%;
      font-size: 1.5rem; line-height: 1; color: #f4ecd8;
      background: linear-gradient(180deg, #232017, #131210);
      border: 1px solid rgba(255,255,255,0.07);
      box-shadow: 0 6px 14px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07);
    }
    .rd-nav:disabled { opacity: 0.3; }
    .rd-nav--fwd {
      background: linear-gradient(180deg, #e8c96a, #c9a84c); color: #14110b; border: none;
    }
    .rd-dots { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }
    .rd-dot { width: 7px; height: 7px; border-radius: 50%; background: rgba(255,255,255,0.16); }
    .rd-dot--done { background: #5cc94c; }
    .rd-dot--on { background: #e8c96a; box-shadow: 0 0 7px rgba(232,201,106,0.7); }

    .rd-hint {
      text-align: center; padding: 0 0 14px; font-size: 0.7rem; color: rgba(255,255,255,0.3);
    }
    .rd-done h1 { color: #f4ecd8; font-size: 1.3rem; margin: 0; }
    .rd-btn {
      min-width: 190px; padding: 12px 20px; border-radius: 12px;
      background: rgba(255,255,255,0.06); color: #f4ecd8; font-size: 0.9rem;
      font-weight: 600; border: 1px solid rgba(255,255,255,0.1);
    }
    .rd-btn--gold {
      background: linear-gradient(180deg, #e8c96a, #c9a84c); color: #14110b;
      border: none; box-shadow: 0 7px 18px rgba(0,0,0,0.5);
    }
  `],
})
export class RecordDeckPage implements OnInit, OnDestroy {
  private studio = inject(StudioApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  loading = signal(true);
  title = signal('');
  cards = signal<RecordCard[]>([]);
  index = signal(0);
  captured = signal<Set<string>>(new Set());

  total = computed(() => this.cards().length);
  atDoneScreen = computed(() => this.total() > 0 && this.index() >= this.total());
  currentCard = computed(() => this.cards()[this.index()] ?? null);
  nextCard = computed(() => this.cards()[this.index() + 1] ?? null);
  capturedCount = computed(() => this.captured().size);
  isCaptured = computed(() => {
    const card = this.currentCard();
    return card ? this.captured().has(card.pointId) : false;
  });

  private episodeId = '';
  private wakeLock: WakeLockHandle | null = null;
  private touchStartX = 0;
  private touchStartY = 0;

  ngOnInit(): void {
    this.episodeId = this.route.snapshot.paramMap.get('episodeId') ?? '';
    if (!this.episodeId) {
      this.loading.set(false);
      return;
    }
    this.studio.getEpisode(this.episodeId).subscribe({
      next: (ep) => {
        this.title.set(ep.title);
        this.cards.set(this.buildCards(ep));
        this.restore();
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.loading.set(false); this.cdr.markForCheck(); },
    });
    this.requestWakeLock();
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  ngOnDestroy(): void {
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.releaseWakeLock();
  }

  // ── Navigation ───────────────────────────────────────────────────────────────

  /** Swiping forward marks the card just delivered as captured. */
  next(): void {
    if (this.loading() || this.atDoneScreen()) return;
    const card = this.currentCard();
    if (card) {
      const set = new Set(this.captured());
      set.add(card.pointId);
      this.captured.set(set);
    }
    this.index.set(Math.min(this.index() + 1, this.total()));
    this.persist();
  }

  prev(): void {
    if (this.index() <= 0) return;
    this.index.set(this.index() - 1);
    this.persist();
  }

  restart(): void {
    this.captured.set(new Set());
    this.index.set(0);
    this.persist();
  }

  exit(): void {
    this.router.navigate(['/studio', this.episodeId]);
  }

  // ── Swipe ────────────────────────────────────────────────────────────────────

  onTouchStart(ev: TouchEvent): void {
    const touch = ev.changedTouches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
  }

  onTouchEnd(ev: TouchEvent): void {
    const touch = ev.changedTouches[0];
    const dx = touch.clientX - this.touchStartX;
    const dy = touch.clientY - this.touchStartY;
    // Ignore short moves and anything more vertical than horizontal (a scroll).
    if (Math.abs(dx) < 50 || Math.abs(dx) <= Math.abs(dy)) return;
    if (dx < 0) this.next();
    else this.prev();
  }

  // ── Build / persist ──────────────────────────────────────────────────────────

  private buildCards(ep: EpisodeAggregate): RecordCard[] {
    const out: RecordCard[] = [];
    for (const section of ep.sections) {
      for (const point of section.points) {
        out.push({
          pointId: point.id,
          section: section.heading,
          text: point.text,
          bridge: point.bridge,
          estSeconds: point.est_seconds,
        });
      }
    }
    return out;
  }

  private storageKey(): string {
    return `km-record-${this.episodeId}`;
  }

  private persist(): void {
    try {
      localStorage.setItem(this.storageKey(), JSON.stringify({
        index: this.index(),
        captured: Array.from(this.captured()),
      }));
    } catch { /* storage unavailable */ }
  }

  private restore(): void {
    try {
      const raw = localStorage.getItem(this.storageKey());
      if (!raw) return;
      const saved = JSON.parse(raw) as { index?: number; captured?: string[] };
      if (Array.isArray(saved.captured)) this.captured.set(new Set(saved.captured));
      if (typeof saved.index === 'number') {
        this.index.set(Math.min(Math.max(saved.index, 0), this.total()));
      }
    } catch { /* ignore a corrupt entry */ }
  }

  // ── Wake lock — keep the screen on while it is acting as a prompter ───────────

  private onVisibility = (): void => {
    if (document.visibilityState === 'visible' && !this.wakeLock) {
      this.requestWakeLock();
    }
  };

  private async requestWakeLock(): Promise<void> {
    try {
      const wl = (navigator as unknown as {
        wakeLock?: { request?: (type: string) => Promise<WakeLockHandle> };
      }).wakeLock;
      if (wl?.request) this.wakeLock = await wl.request('screen');
    } catch { /* unsupported or denied — not critical */ }
  }

  private releaseWakeLock(): void {
    try { this.wakeLock?.release?.(); } catch { /* already gone */ }
    this.wakeLock = null;
  }
}
