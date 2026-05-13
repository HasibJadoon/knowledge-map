// ─── Mufradat shell — al-Raghib reader, GSAP-driven panel layout ───────────
//
// LAYOUT MODEL
// ════════════
// The reader is a viewport-sized region with two RTL-natural rails:
//   • Root index    (.rail--index)     — anchored at the inline-start edge
//                                        (right side in RTL)
//   • Quran + notes (.rail--citations) — anchored at the inline-end edge
//                                        (left side in RTL)
// The middle column (.content) reserves space for each rail via
// `padding-inline-start/end`. Toggles + resizers ride the rail's inner
// edge via the same CSS variables that drive rail width.
//
// ANIMATION MODEL
// ═══════════════
// Two CSS custom properties on the host are the single source of truth
// for layout: `--w-index` and `--w-citations`. Everything that depends
// on rail width — rail itself, content padding, toggle position,
// resizer position — reads from these vars, so when one var changes the
// whole UI shifts together.
//
// Toggling is animated by a CSS transition that's gated on a temporary
// `.anim-{side}` class on the host. The TS layer writes the new var
// value AND adds the class for the transition duration, then removes
// the class. Drag-resize never touches the class, so resize stays
// pixel-perfect with zero easing/lag.
//
// RESPONSIVE
// ══════════
// Below `MOBILE_BREAKPOINT`, the rails become fixed overlays (content
// padding is reset). The same var still drives rail width, so the
// animation pipeline is identical on every viewport size.

import {
  AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, ElementRef,
  HostListener, ViewChild, computed, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest, of, catchError } from 'rxjs';
import {
  AlDictionaryApiService, LexV2RootRow, MufradatReadView,
} from '../../../../shared/services/al-dictionary-api.service';
import { MufradatReaderComponent } from '../../mufradat-reader/mufradat-reader.component';

export const MUFRADAT_SLUG = 'ketabonline_al_raghib_mufradat';

const RAIL = {
  INDEX_DEFAULT:     300, INDEX_MIN:     220, INDEX_MAX:     480,
  CITATIONS_DEFAULT: 340, CITATIONS_MIN: 260, CITATIONS_MAX: 640,
  MOBILE_BREAKPOINT: 880,
};

// Panel motion durations. The CSS transition curve on `.rail` matches
// the worldview-library reader's `power3.out` decel feel.
const DUR_WIDTH = 480;   // ms
const DUR_FADE  = 320;   // ms

type Side = 'index' | 'citations';

@Component({
  selector: 'km-mufradat-shell',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MufradatReaderComponent],
  templateUrl: './mufradat-shell.component.html',
  styleUrl: './mufradat-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.dark]':  'darkMode()',
    '[class.fs-xs]': 'fontSize() === 0',
    '[class.fs-sm]': 'fontSize() === 1',
    '[class.fs-md]': 'fontSize() === 2',
    '[class.fs-lg]': 'fontSize() === 3',
    '[class.fs-xl]': 'fontSize() === 4',
  },
})
export class MufradatShellComponent implements AfterViewInit {
  @ViewChild('content',        { static: false }) contentRef?:        ElementRef<HTMLElement>;
  @ViewChild('indexRail',      { static: false }) indexRailRef?:      ElementRef<HTMLElement>;
  @ViewChild('citationsRail',  { static: false }) citationsRailRef?:  ElementRef<HTMLElement>;

  private readonly hostEl     = inject(ElementRef<HTMLElement>);
  private readonly api        = inject(AlDictionaryApiService);
  private readonly route      = inject(ActivatedRoute);
  private readonly router     = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  // ── Reader state ─────────────────────────────────────────────────────
  readonly currentRoot = signal('');
  readonly loading     = signal(false);
  readonly view        = signal<MufradatReadView | null>(null);
  readonly error       = signal<string | null>(null);

  // ── Root index ───────────────────────────────────────────────────────
  readonly rootList        = signal<LexV2RootRow[]>([]);
  readonly rootListLoading = signal(false);
  readonly rootSearch      = signal('');

  readonly filteredRoots = computed(() => {
    const q = this.rootSearch().trim();
    const all = this.rootList();
    if (!q) return all;
    return all.filter(r =>
      r.root_norm.includes(q) || (r.root_text ?? '').includes(q));
  });

  readonly rootsByLetter = computed(() => {
    const out = new Map<string, LexV2RootRow[]>();
    for (const r of this.filteredRoots()) {
      const letter = (r.root_norm ?? '?')[0] ?? '?';
      const arr = out.get(letter) ?? [];
      arr.push(r);
      out.set(letter, arr);
    }
    return [...out.entries()].sort();
  });

  // ── UI preferences ───────────────────────────────────────────────────
  readonly darkMode          = signal(true);
  readonly showIndex         = signal(true);
  readonly showCitations     = signal(true);
  readonly citationsExpanded = signal(false);
  readonly fontSize          = signal(2);   // 0=xs … 4=xl
  readonly fontSizeClass     = computed(() =>
    ['fs-xs', 'fs-sm', 'fs-md', 'fs-lg', 'fs-xl'][this.fontSize()]);

  // User-chosen rail widths (drag-resize). The effective width animated
  // via GSAP is derived from these + open/closed/expanded state.
  readonly indexWidth     = signal(RAIL.INDEX_DEFAULT);
  readonly citationsWidth = signal(RAIL.CITATIONS_DEFAULT);

  // Drag-resize state (cleared on pointerup)
  private dragSide:   Side | null = null;
  private dragStartX = 0;
  private dragStartW = 0;

  // ── Route subscription ───────────────────────────────────────────────
  constructor() {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed())
      .subscribe(([params, query]) => {
        const slug = params.get('slug') ?? '';
        if (slug !== MUFRADAT_SLUG) return;
        if (this.rootList().length === 0) this.loadRoots();
        const root = query.get('root') ?? '';
        if (root) this.loadEntry(root);
        else if (this.rootList().length > 0)
          this.goToRoot(this.rootList()[0].root_norm);
      });
  }

  ngAfterViewInit() {
    // Seed the CSS vars to current widths so the layout matches state
    // before the first animated toggle.
    this.setVar('index',     this.targetWidth('index'));
    this.setVar('citations', this.targetWidth('citations'));
  }

  // ── Animation primitives ─────────────────────────────────────────────
  // Single source of truth: `--w-{side}` on the host. Everything that
  // depends on rail width (content padding, toggle position, resizer
  // position) reads this var, so one tween moves the whole UI together.

  private targetWidth(side: Side): number {
    if (side === 'index') return this.showIndex() ? this.indexWidth() : 0;
    if (!this.showCitations()) return 0;
    if (this.citationsExpanded()) return this.viewportWidth();
    return this.citationsWidth();
  }

  private viewportWidth(): number {
    return typeof window === 'undefined' ? 1280 : window.innerWidth;
  }

  /**
   * Open or close a rail. Width animation is driven by a CSS transition
   * on the rail element's `width` (matching `--w-{side}` via the CSS
   * layout), so it's GPU-friendly and runs even on backgrounded tabs.
   * Opacity is tweened too so the rail content fades during the slide.
   */
  private tween(side: Side) {
    const host   = this.hostEl.nativeElement;
    const target = this.targetWidth(side);
    const open   = target > 0;
    host.classList.add(`anim-${side}`);
    host.style.setProperty(`--w-${side}`, `${target}px`);
    window.setTimeout(() =>
      host.classList.remove(`anim-${side}`), DUR_WIDTH + 40);

    const railEl = side === 'index'
      ? this.indexRailRef?.nativeElement
      : this.citationsRailRef?.nativeElement;
    if (railEl) {
      railEl.style.transition = `opacity ${DUR_FADE}ms cubic-bezier(.45,0,.25,1)`;
      railEl.style.opacity = open ? '1' : '0';
    }
  }

  /** Apply a width to the rail's CSS var instantly — no animation. */
  private setVar(side: Side, w: number) {
    const host = this.hostEl.nativeElement;
    host.classList.remove(`anim-${side}`);
    host.style.setProperty(`--w-${side}`, `${w}px`);
  }

  // ── Toggles ──────────────────────────────────────────────────────────
  toggleDark() { this.darkMode.update(v => !v); }

  toggleIndex() {
    this.showIndex.update(v => !v);
    this.tween('index');
  }

  toggleCitations() {
    const next = !this.showCitations();
    this.showCitations.set(next);
    if (!next) this.citationsExpanded.set(false);
    this.tween('citations');
  }

  toggleExpanded(e?: Event) {
    e?.stopPropagation();
    e?.preventDefault();
    this.showCitations.set(true);
    this.citationsExpanded.update(v => !v);
    this.tween('citations');
  }

  changeFont(d: number) {
    this.fontSize.set(Math.max(0, Math.min(4, this.fontSize() + d)));
  }

  // ── Drag-to-resize ───────────────────────────────────────────────────
  // In RTL the index rail is on the viewport's RIGHT — dragging LEFT
  // grows it (delta-X < 0 ⇒ width up). The citations rail is on the
  // LEFT — dragging RIGHT grows it (delta-X > 0 ⇒ width up).
  startResize(side: Side, e: PointerEvent) {
    e.preventDefault();
    this.dragSide   = side;
    this.dragStartX = e.clientX;
    this.dragStartW = side === 'index' ? this.indexWidth() : this.citationsWidth();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    (e.target as HTMLElement).classList.add('dragging');
  }

  @HostListener('window:pointermove', ['$event'])
  onResizeMove(e: PointerEvent) {
    if (!this.dragSide) return;
    const delta  = e.clientX - this.dragStartX;
    const signed = this.dragSide === 'index' ? -delta : delta;
    const next   = this.dragSide === 'index'
      ? Math.max(RAIL.INDEX_MIN,     Math.min(RAIL.INDEX_MAX,     this.dragStartW + signed))
      : Math.max(RAIL.CITATIONS_MIN, Math.min(RAIL.CITATIONS_MAX, this.dragStartW + signed));
    if (this.dragSide === 'index') this.indexWidth.set(next);
    else                            this.citationsWidth.set(next);
    this.setVar(this.dragSide, next);
  }

  @HostListener('window:pointerup')
  onResizeEnd() {
    if (!this.dragSide) return;
    document.querySelectorAll('.rail-resizer.dragging')
      .forEach(el => el.classList.remove('dragging'));
    this.dragSide = null;
  }

  // ── Window resize keeps expanded citations rail at viewport width ───
  @HostListener('window:resize')
  onWindowResize() {
    if (this.citationsExpanded() && this.showCitations()) {
      this.setVar('citations', this.viewportWidth());
    }
  }

  // ── Navigation ───────────────────────────────────────────────────────
  goToRoot(root_norm: string) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { root: root_norm },
      queryParamsHandling: 'merge',
    });
  }

  prevRoot() {
    const list = this.rootList();
    const idx = list.findIndex(r => r.root_norm === this.currentRoot());
    if (idx > 0) this.goToRoot(list[idx - 1].root_norm);
  }

  nextRoot() {
    const list = this.rootList();
    const idx = list.findIndex(r => r.root_norm === this.currentRoot());
    if (idx >= 0 && idx < list.length - 1) this.goToRoot(list[idx + 1].root_norm);
  }

  // ── Data loading ─────────────────────────────────────────────────────
  private loadRoots() {
    this.rootListLoading.set(true);
    this.api.getV2Roots({ source: MUFRADAT_SLUG, limit: 10000 }).pipe(
      catchError(() =>
        of({ rows: [], total: 0, page: 1, limit: 0, has_more: false })),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(r => {
      this.rootList.set(r.rows);
      this.rootListLoading.set(false);
      if (!this.currentRoot() && r.rows.length > 0)
        this.goToRoot(r.rows[0].root_norm);
    });
  }

  private loadEntry(root_norm: string) {
    this.loading.set(true);
    this.error.set(null);
    this.currentRoot.set(root_norm);
    this.api.getMufradatRead(root_norm).pipe(
      catchError(() => {
        this.error.set('تعذّر تحميل المادة');
        return of(null);
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(v => {
      this.view.set(v);
      this.loading.set(false);
      queueMicrotask(() => this.contentRef?.nativeElement.scrollTo({ top: 0 }));
    });
  }

  // ── Cross-feature actions ────────────────────────────────────────────
  openAyah(surah: number, ayah: number) {
    if (!surah || !ayah) return;
    this.router.navigate(['/quran/al-quran'], {
      queryParams: { surah, startingVerse: ayah },
    });
  }

  openFootnoteInPanel(payload: { num: number; printed_page: number | null }) {
    if (!this.showCitations()) {
      this.showCitations.set(true);
      this.tween('citations');
    }
    setTimeout(() => {
      const host = this.contentRef?.nativeElement?.closest('.reader__body');
      if (!host) return;
      const panel = host.querySelector<HTMLDetailsElement>('.rail__panel--notes');
      if (panel && !panel.open) panel.open = true;
      const exact = host.querySelector<HTMLElement>(
        `.fn-list__item[data-fn-num="${payload.num}"][data-fn-page="${payload.printed_page ?? ''}"]`);
      const target = exact ?? host.querySelector<HTMLElement>(
        `.fn-list__item[data-fn-num="${payload.num}"]`);
      if (!target) return;
      const scroller = target.closest<HTMLElement>('.rail__scroll');
      if (scroller) {
        const tr = target.getBoundingClientRect();
        const sr = scroller.getBoundingClientRect();
        scroller.scrollTop = Math.max(0,
          scroller.scrollTop + (tr.top - sr.top)
            - scroller.clientHeight / 2 + tr.height / 2);
      } else {
        target.scrollIntoView({ block: 'center' });
      }
      target.classList.add('fn-list__item--focused');
      setTimeout(() => target.classList.remove('fn-list__item--focused'), 2400);
    }, 120);
  }

  // ── Keyboard shortcuts ───────────────────────────────────────────────
  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    switch (e.key) {
      case 'ArrowLeft':  this.nextRoot(); e.preventDefault(); break; // RTL
      case 'ArrowRight': this.prevRoot(); e.preventDefault(); break;
      case 'j': this.contentRef?.nativeElement.scrollBy({ top: 80,  behavior: 'smooth' }); break;
      case 'k': this.contentRef?.nativeElement.scrollBy({ top: -80, behavior: 'smooth' }); break;
      case '[': this.toggleIndex(); break;
      case ']': this.toggleCitations(); break;
      case 'd': this.toggleDark(); break;
      case '+': this.changeFont(+1); break;
      case '-': this.changeFont(-1); break;
    }
  }
}
