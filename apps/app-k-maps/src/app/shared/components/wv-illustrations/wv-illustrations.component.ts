import {
  ChangeDetectionStrategy, Component, ElementRef, HostListener,
  Input, OnDestroy, ViewChild, computed, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import gsap from 'gsap';

import {
  WorldviewLibraryApiService,
  WvIllustrationSummary,
  WvReadingSession,
} from '../../services/worldview/worldview-library-api.service';

/** A reading session (reading block within a chapter) with its content + illustrations. */
interface Session {
  id: string;
  title: string;
  summary: string[];   // paragraphs
  points: string[];    // major points
  fullText: string[];  // paraphrased reading text, paragraphs
  items: WvIllustrationSummary[];
}

// ─── Worldview reading-session illustrations (mobile) ─────────────────────────
// A toolbar icon (visible when the open chapter has reading sessions that carry
// illustrations). Opens a full-screen modal that first lists the chapter's
// reading sessions; selecting one shows that session's paraphrased reading text,
// major points, summary, and its illustrations (swiped 1-by-1). The overlay is
// teleported to <body> so it is never trapped by the transformed ion-toolbar.
@Component({
  selector: 'app-wv-illustrations',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    @if (sessions().length) {
      <button type="button" class="wvi-trigger" (click)="open()" [title]="triggerLabel()" [attr.aria-label]="triggerLabel()">
        <svg class="wvi-trigger__icon" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="4.5" width="18" height="15" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.6"/>
          <circle cx="8.5" cy="9.5" r="1.7" fill="currentColor"/>
          <path d="M4 17l4.5-4.5 3 3 3.5-4.5 5 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
        </svg>
        @if (sessions().length > 1) { <span class="wvi-trigger__badge">{{ sessions().length }}</span> }
      </button>

      @if (isOpen()) {
        <div class="wvi-modal" #overlay role="dialog" aria-modal="true" aria-label="Reading sessions" (click)="onBackdrop($event)">
          <div class="wvi-modal__bar">
            @if (view() === 'session') {
              <button type="button" class="wvi-back" (click)="toList()" aria-label="Back to sessions">‹ Sessions</button>
            }
            <span class="wvi-modal__title">
              {{ view() === 'list' ? 'Reading sessions' : (activeSession()?.title || 'Reading session') }}
            </span>
            <button type="button" class="wvi-modal__close" (click)="close()" aria-label="Close">✕</button>
          </div>

          @if (view() === 'list') {
            <div class="wvi-list">
              @for (s of sessions(); track s.id) {
                <button type="button" class="wvi-session" (click)="openSession(s)">
                  <span class="wvi-session__head">
                    <svg class="wvi-session__ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/></svg>
                    <span class="wvi-session__title">{{ s.title }}</span>
                    <span class="wvi-session__count">{{ s.items.length }}</span>
                  </span>
                  @if (s.summary.length) { <span class="wvi-session__summary">{{ s.summary[0] }}</span> }
                </button>
              }
            </div>
          } @else if (activeSession(); as s) {
            <div class="wvi-doc">
              @if (s.summary.length) {
                <section class="wvi-sec wvi-sec--lead">
                  <h4 class="wvi-sec__h"><svg class="wvi-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M6 3h9l5 5v13H6z"/><path d="M14 3v6h6"/><path d="M9 13h7M9 17h5"/></svg>Summary</h4>
                  @for (p of s.summary; track $index) { <p class="wvi-sec__p">{{ p }}</p> }
                </section>
              }
              @if (s.points.length) {
                <section class="wvi-sec">
                  <h4 class="wvi-sec__h"><svg class="wvi-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1.2" fill="currentColor" stroke="none"/></svg>Major points</h4>
                  <ul class="wvi-points">@for (pt of s.points; track $index) { <li>{{ pt }}</li> }</ul>
                </section>
              }
              @if (s.fullText.length) {
                <section class="wvi-sec wvi-reading">
                  <h4 class="wvi-sec__h"><svg class="wvi-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 6c-2-1.5-5-1.5-7 0v12c2-1.5 5-1.5 7 0 2-1.5 5-1.5 7 0V6c-2-1.5-5-1.5-7 0z"/><path d="M12 6v12"/></svg>Reading — paraphrased</h4>
                  @for (p of s.fullText; track $index) { <p class="wvi-sec__p">{{ p }}</p> }
                </section>
              }

              @if (s.items.length) {
                <section class="wvi-sec">
                  <h4 class="wvi-sec__h">
                    <svg class="wvi-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.5" fill="currentColor" stroke="none"/><path d="M4 17l5-5 3 3 4-4 4 4"/></svg>
                    Illustrations
                    @if (s.items.length > 1) { <span class="wvi-sec__count">{{ current() + 1 }} / {{ s.items.length }}</span> }
                  </h4>
                  <div class="wvi-figs">
                    <div class="wvi-track" #track (scroll)="onScroll()">
                      @for (it of s.items; track it.id) {
                        <div class="wvi-slide">
                          @if (docFor(it.id); as doc) {
                            <iframe class="wvi-frame" [srcdoc]="$any(doc)" sandbox="allow-same-origin" referrerpolicy="no-referrer" [title]="it.title || 'Illustration'"></iframe>
                          } @else {
                            <div class="wvi-frame wvi-frame--loading">Loading…</div>
                          }
                        </div>
                      }
                    </div>
                    @if (s.items.length > 1) {
                      <button type="button" class="wvi-arrow wvi-arrow--prev" (click)="go(-1)" [disabled]="current() === 0" aria-label="Previous">‹</button>
                      <button type="button" class="wvi-arrow wvi-arrow--next" (click)="go(1)" [disabled]="current() === s.items.length - 1" aria-label="Next">›</button>
                      <div class="wvi-dots">
                        @for (it of s.items; track it.id; let i = $index) {
                          <button type="button" class="wvi-dot" [class.wvi-dot--on]="i === current()" (click)="goTo(i)" [attr.aria-label]="'Go to illustration ' + (i + 1)"></button>
                        }
                      </div>
                    }
                  </div>
                </section>
              }
            </div>
          }
        </div>
      }
    }
  `,
  styles: [`
    .wvi-trigger {
      position: relative; display: inline-flex; align-items: center; justify-content: center;
      width: 2.4rem; height: 2.4rem; padding: 0; cursor: pointer; background: transparent; border: 0;
      color: #c9a84c; border-radius: 8px;
    }
    .wvi-trigger__icon { width: 1.4rem; height: 1.4rem; display: block; }
    .wvi-trigger__badge { position: absolute; top: 1px; right: 1px; min-width: 15px; height: 15px; padding: 0 3px; font-size: 9px; font-weight: 700; line-height: 15px; text-align: center; color: #080808; background: #c9a84c; border-radius: 8px; }

    .wvi-modal { position: fixed; inset: 0; z-index: 100000; display: flex; flex-direction: column; background: #0d0d0d; }
    .wvi-modal__bar {
      display: flex; align-items: center; gap: .75rem; flex: 0 0 auto;
      padding: calc(env(safe-area-inset-top, 0px) + .7rem) .9rem .7rem;
      border-bottom: 1px solid rgba(255,255,255,.08);
    }
    .wvi-back { flex: 0 0 auto; border: 0; background: transparent; cursor: pointer; font-size: 12px; color: #c9a84c; padding: 2px 4px 2px 0; }
    .wvi-modal__title { flex: 1 1 auto; min-width: 0; font-size: 13.5px; font-weight: 600; color: rgba(255,255,255,.92); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .wvi-modal__close { flex: 0 0 auto; width: 32px; height: 32px; border: 0; border-radius: 7px; cursor: pointer; background: rgba(255,255,255,.06); color: rgba(255,255,255,.7); font-size: 15px; }

    .wvi-list { flex: 1 1 auto; overflow-y: auto; padding: .7rem; }
    .wvi-session {
      display: block; width: 100%; text-align: left; cursor: pointer; margin: 0 0 .65rem; padding: .95rem 1rem;
      background: linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.015));
      border: 1px solid rgba(255,255,255,.08); border-radius: 13px;
      transition: border-color .18s ease, transform .12s ease;
    }
    .wvi-session:active { transform: scale(.985); border-color: rgba(201,168,76,.4); }
    .wvi-session__head { display: flex; align-items: center; gap: .55rem; }
    .wvi-session__ic { width: 17px; height: 17px; flex: 0 0 auto; color: #c9a84c; }
    .wvi-ic {
      width: 23px; height: 23px; flex: 0 0 auto; padding: 4.5px; box-sizing: border-box;
      border-radius: 7px; color: #c9a84c; background: rgba(201,168,76,.13); border: 1px solid rgba(201,168,76,.22);
    }
    .wvi-session__title { flex: 1 1 auto; min-width: 0; font-size: 14px; font-weight: 600; color: rgba(255,255,255,.92); }
    .wvi-session__count { flex: 0 0 auto; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 10px; font-size: 11px; font-weight: 700; line-height: 20px; text-align: center; color: #080808; background: #c9a84c; }
    .wvi-session__summary { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-top: .35rem; font-size: 12.5px; color: rgba(255,255,255,.55); line-height: 1.45; }

    .wvi-doc { flex: 1 1 auto; overflow-y: auto; padding: 1.1rem 1.15rem calc(env(safe-area-inset-bottom, 0px) + 1.4rem); }
    .wvi-sec { margin: 0 0 1.7rem; }
    .wvi-sec:last-child { margin-bottom: 0; }
    .wvi-sec__h {
      display: flex; align-items: center; gap: .55rem; margin: 0 0 .75rem;
      font-size: 10.5px; letter-spacing: .24em; text-transform: uppercase; font-weight: 700; color: #c9a84c;
    }
    .wvi-sec__h::after {
      content: ''; flex: 1 1 auto; height: 1px;
      background: linear-gradient(to right, rgba(201,168,76,.35), transparent);
    }
    .wvi-sec__count { flex: 0 0 auto; font-size: 10px; letter-spacing: .08em; color: rgba(255,255,255,.5); font-variant-numeric: tabular-nums; }
    .wvi-sec__p { margin: 0 0 .7rem; font-size: 14px; line-height: 1.62; color: rgba(255,255,255,.74); }
    .wvi-sec__p:last-child { margin-bottom: 0; }

    /* Summary — editorial lead, justified */
    .wvi-sec--lead .wvi-sec__p {
      font-size: 17px; line-height: 1.75; font-weight: 300; letter-spacing: .003em; color: rgba(255,255,255,.9);
      text-align: justify; text-justify: inter-word; hyphens: auto;
    }

    /* Major points — gold diamond markers */
    .wvi-points { margin: 0; padding: 0; list-style: none; }
    .wvi-points li {
      position: relative; margin: 0 0 .65rem; padding-left: 1.45rem;
      font-size: 15.5px; line-height: 1.6; color: rgba(255,255,255,.88);
    }
    .wvi-points li::before {
      content: ''; position: absolute; left: .12rem; top: .56em; width: 6px; height: 6px;
      background: #c9a84c; transform: rotate(45deg); border-radius: 1px;
    }

    /* Reading — drop cap, justified, muted closing note */
    .wvi-reading .wvi-sec__p { font-size: 14px; line-height: 1.7; color: rgba(255,255,255,.78); text-align: justify; text-justify: inter-word; hyphens: auto; }
    .wvi-reading .wvi-sec__p:first-of-type::first-letter {
      font-family: Georgia, 'Times New Roman', serif; float: left; font-size: 2.9em; line-height: .82;
      padding: .02em .14em 0 0; color: #c9a84c; font-weight: 600;
    }
    .wvi-reading .wvi-sec__p:last-child { font-size: 12px; font-style: italic; color: rgba(255,255,255,.4); margin-top: .9rem; text-align: left; }

    .wvi-figs { position: relative; height: min(70vh, 760px); border: 1px solid rgba(255,255,255,.08); border-radius: 10px; overflow: hidden; }
    .wvi-track { width: 100%; height: 100%; display: flex; overflow-x: auto; overflow-y: hidden; scroll-snap-type: x mandatory; scroll-behavior: smooth; -webkit-overflow-scrolling: touch; }
    .wvi-track::-webkit-scrollbar { display: none; }
    .wvi-slide { flex: 0 0 100%; width: 100%; height: 100%; scroll-snap-align: center; }
    .wvi-frame { width: 100%; height: 100%; border: 0; background: #080808; display: block; }
    .wvi-frame--loading { display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,.3); font-size: 13px; }

    .wvi-arrow { position: absolute; top: 50%; transform: translateY(-50%); width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; cursor: pointer; border: 1px solid rgba(255,255,255,.14); border-radius: 50%; background: rgba(13,13,13,.82); color: rgba(255,255,255,.92); font-size: 22px; line-height: 1; }
    .wvi-arrow--prev { left: 8px; }
    .wvi-arrow--next { right: 8px; }
    .wvi-arrow:disabled { opacity: .28; }
    .wvi-dots { position: absolute; left: 0; right: 0; bottom: 10px; display: flex; gap: 7px; justify-content: center; }
    .wvi-dot { width: 7px; height: 7px; padding: 0; border: 0; border-radius: 50%; cursor: pointer; background: rgba(255,255,255,.28); }
    .wvi-dot--on { background: #c9a84c; }
  `],
})
export class WvIllustrationsComponent implements OnDestroy {
  private readonly api = inject(WorldviewLibraryApiService);
  private readonly sanitizer = inject(DomSanitizer);

  @ViewChild('overlay') private overlayRef?: ElementRef<HTMLElement>;
  @ViewChild('track') private trackRef?: ElementRef<HTMLElement>;

  readonly sessions = signal<Session[]>([]);
  private readonly docCache = signal<Record<string, SafeHtml>>({});

  readonly isOpen = signal(false);
  readonly view = signal<'list' | 'session'>('list');
  readonly activeSessionId = signal<string | null>(null);
  readonly current = signal(0);

  private readonly sourceIdSig = signal<string | null>(null);
  private readonly chapterIdSig = signal<string | null>(null);
  private token = 0;
  private anim?: ReturnType<typeof gsap.context>;

  readonly activeSession = computed<Session | null>(() =>
    this.sessions().find((s) => s.id === this.activeSessionId()) ?? null,
  );

  /** The source the chapter belongs to. */
  @Input() set sourceId(value: string | null | undefined) {
    this.sourceIdSig.set(value ?? null);
    this.reload();
  }

  /** The chapter (source unit) whose reading sessions to show. */
  @Input() set chapterUnitId(value: string | null | undefined) {
    this.chapterIdSig.set(value ?? null);
    this.reload();
  }

  triggerLabel(): string {
    const n = this.sessions().length;
    return `Reading sessions · ${n} with illustrations`;
  }

  docFor(id: string): SafeHtml | undefined {
    return this.docCache()[id];
  }

  ngOnDestroy(): void {
    this.anim?.revert();
    this.restoreScroll();
    this.overlayRef?.nativeElement?.remove();
  }

  /** Run a GSAP entrance build scoped to the overlay (respects reduced-motion). */
  private animate(build: () => void): void {
    if (typeof window === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;
    const root = this.overlayRef?.nativeElement;
    if (!root) return;
    this.anim?.revert();
    this.anim = gsap.context(build, root);
  }

  private reload(): void {
    void this.load(this.sourceIdSig(), this.chapterIdSig());
  }

  private async load(sourceId: string | null, chapterId: string | null): Promise<void> {
    const mine = ++this.token;
    this.close();
    if (!sourceId || !chapterId) { this.sessions.set([]); return; }

    let rsList: WvReadingSession[] = [];
    try { rsList = await firstValueFrom(this.api.listSessions(sourceId)); } catch { rsList = []; }
    if (mine !== this.token) return;

    const forChapter = rsList.filter((rs) => rs.source_unit_id === chapterId);

    const built = await Promise.all(forChapter.map(async (rs) => {
      let items: WvIllustrationSummary[] = [];
      try { items = await firstValueFrom(this.api.listReadingSessionIllustrations(rs.id)); } catch { items = []; }
      return { rs, items };
    }));
    if (mine !== this.token) return;

    // Order sessions by their first illustration so reading order follows the concept sequence.
    const sessions = built.filter((x) => x.items.length).map((x) => this.buildSession(x.rs, x.items));
    sessions.sort((a, b) => (a.items[0]?.order_index ?? 0) - (b.items[0]?.order_index ?? 0));
    this.sessions.set(sessions);
  }

  private buildSession(rs: WvReadingSession, items: WvIllustrationSummary[]): Session {
    let points: string[] = [];
    let fullText: string[] = [];
    if (rs.meta_json) {
      try {
        const m = JSON.parse(rs.meta_json) as Record<string, unknown>;
        if (Array.isArray(m['major_points'])) points = m['major_points'].map((p) => String(p)).filter(Boolean);
        const ft = m['paraphrase_md'] ?? m['full_text_md'] ?? m['full_text'] ?? '';
        fullText = this.paragraphs(String(ft));
      } catch { /* ignore malformed meta */ }
    }
    return {
      id: rs.id,
      title: (rs.title ?? '').trim() || 'Reading session',
      summary: this.paragraphs(rs.summary_md ?? ''),
      points,
      fullText,
      items,
    };
  }

  private paragraphs(text: string): string[] {
    return text.split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean);
  }

  open(): void {
    if (!this.sessions().length) return;
    this.view.set('list');
    this.activeSessionId.set(null);
    this.isOpen.set(true);
    if (typeof document !== 'undefined') document.body.style.overflow = 'hidden';
    setTimeout(() => {
      const el = this.overlayRef?.nativeElement;
      if (el && el.parentElement !== document.body) document.body.appendChild(el);
      this.animate(() => gsap.from('.wvi-session', { y: 16, opacity: 0, duration: 0.42, stagger: 0.07, ease: 'power3.out' }));
    }, 0);
  }

  close(): void {
    this.anim?.revert();
    this.anim = undefined;
    this.isOpen.set(false);
    this.restoreScroll();
  }

  private restoreScroll(): void {
    if (typeof document !== 'undefined') document.body.style.overflow = '';
  }

  openSession(session: Session): void {
    this.activeSessionId.set(session.id);
    this.current.set(0);
    this.view.set('session');
    void this.fetchDocs(session.items);
    setTimeout(() => {
      this.trackRef?.nativeElement?.scrollTo({ left: 0 });
      this.animate(() => {
        gsap.from('.wvi-sec', { y: 18, opacity: 0, duration: 0.5, stagger: 0.09, ease: 'power3.out' });
        gsap.from('.wvi-points li', { x: 12, duration: 0.4, stagger: 0.05, delay: 0.2, ease: 'power2.out' });
      });
    }, 0);
  }

  toList(): void {
    this.view.set('list');
    setTimeout(() => this.animate(() => gsap.from('.wvi-session', { y: 16, opacity: 0, duration: 0.42, stagger: 0.07, ease: 'power3.out' })), 0);
  }

  private async fetchDocs(items: WvIllustrationSummary[]): Promise<void> {
    const missing = items.filter((it) => !this.docCache()[it.id]);
    if (!missing.length) return;
    const details = await Promise.all(
      missing.map((it) => firstValueFrom(this.api.getIllustration(it.id)).catch(() => null)),
    );
    const next = { ...this.docCache() };
    details.forEach((detail) => {
      if (detail?.html_content) next[detail.id] = this.sanitizer.bypassSecurityTrustHtml(detail.html_content);
    });
    this.docCache.set(next);
  }

  onBackdrop(event: MouseEvent): void {
    if ((event.target as HTMLElement)?.classList?.contains('wvi-modal')) this.close();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.isOpen()) return;
    if (this.view() === 'session') this.toList();
    else this.close();
  }

  go(delta: number): void {
    this.goTo(this.current() + delta);
  }

  goTo(index: number): void {
    const max = (this.activeSession()?.items.length ?? 1) - 1;
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
