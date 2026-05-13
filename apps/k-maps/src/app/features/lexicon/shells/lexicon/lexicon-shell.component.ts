// ─── Lisan al-Arab shell ──────────────────────────────────────────────────
// Mirrors the Mufradat shell's dockview layout (CSS-var-driven panel
// widths, smooth toggles, dark mode, 5-step font scaling, keyboard
// shortcuts). The right rail hosts FIVE panels instead of Mufradat's two:
//   footnotes · Quran citations · hadith · poetry shawahid · authorities
//
// All cross-cutting layout SCSS is identical to Mufradat — both shells
// load the same set of CSS custom properties on the host, so the visual
// system stays consistent across lexicons.

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
  AlDictionaryApiService, LexV2RootRow, LisanReadView,
} from '../../../../shared/services/al-dictionary-api.service';
import { LexiconReaderComponent } from '../../lexicon-reader/lexicon-reader.component';

export const LISAN_SLUG = 'ketabonline_ibn_manzur_lisan_al_arab';

// All slugs that this shell can render. The back-end composer exposes
// the same response shape for each. Adding a slug here lets the shell
// fetch + render it without any further changes.
export const CLASSICAL_LEXICON_SLUGS = new Set<string>([
  LISAN_SLUG,
  'ketabonline_al_jawhari_al_sihah',
  'thahabi_al_khalil_kitab_al_ayn',
  'saaid_maqayis_al_lugha',
  'qomra_al_ubab_al_zakhir',
  // Sources whose ingestion chunker emitted {…} braces (al-Qamus matn for
  // Taj, parenthesized headwords for Misbah / Jamharat). Their Qur'ān
  // citations were resolved offline and live in quran_refs; the composer
  // handles the rest as standard classical-lexicon content.
  'ketabonline_al_zabidi_taj_al_arus',
  'ketabonline_al_fayyumi_misbah_munir',
  'ketabonline_ibn_duraid_jamharat_al_lugha',
  'qomra_al_qamus_al_muhit',
]);

const RAIL = {
  INDEX_DEFAULT:     320, INDEX_MIN:     220, INDEX_MAX:     480,
  CITATIONS_DEFAULT: 360, CITATIONS_MIN: 260, CITATIONS_MAX: 720,
  MOBILE_BREAKPOINT: 880,
};
const DUR_WIDTH = 480;
const DUR_FADE  = 320;
type Side = 'index' | 'citations';

@Component({
  selector: 'km-lexicon-shell',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LexiconReaderComponent],
  templateUrl: './lexicon-shell.component.html',
  styleUrl: './lexicon-shell.component.scss',
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
export class LexiconShellComponent implements AfterViewInit {
  @ViewChild('content',       { static: false }) contentRef?:       ElementRef<HTMLElement>;
  @ViewChild('indexRail',     { static: false }) indexRailRef?:     ElementRef<HTMLElement>;
  @ViewChild('citationsRail', { static: false }) citationsRailRef?: ElementRef<HTMLElement>;

  private readonly hostEl     = inject(ElementRef<HTMLElement>);
  private readonly api        = inject(AlDictionaryApiService);
  private readonly route      = inject(ActivatedRoute);
  private readonly router     = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  // The source we're currently rendering — set from the route's :slug
  // param. Defaults to Lisan for back-compat; the route subscription
  // updates it on every navigation between sources.
  readonly activeSlug  = signal<string>(LISAN_SLUG);
  readonly currentRoot = signal('');
  readonly loading     = signal(false);
  readonly view        = signal<LisanReadView | null>(null);
  readonly error       = signal<string | null>(null);

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

  readonly darkMode          = signal(true);
  readonly showIndex         = signal(true);
  readonly showCitations     = signal(true);
  readonly citationsExpanded = signal(false);
  readonly fontSize          = signal(2);
  readonly fontSizeClass     = computed(() =>
    ['fs-xs', 'fs-sm', 'fs-md', 'fs-lg', 'fs-xl'][this.fontSize()]);

  readonly indexWidth     = signal(RAIL.INDEX_DEFAULT);
  readonly citationsWidth = signal(RAIL.CITATIONS_DEFAULT);

  private dragSide:   Side | null = null;
  private dragStartX = 0;
  private dragStartW = 0;

  constructor() {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed())
      .subscribe(([params, query]) => {
        const slug = params.get('slug') ?? '';
        if (!CLASSICAL_LEXICON_SLUGS.has(slug)) return;
        // Remember which source we're rendering so loadRoots / loadEntry
        // can fetch from the right backend route.
        this.activeSlug.set(slug);
        if (this.rootList().length === 0) this.loadRoots();
        const root = query.get('root') ?? '';
        if (root) this.loadEntry(root);
        else if (this.rootList().length > 0)
          this.goToRoot(this.rootList()[0].root_norm);
      });
  }

  ngAfterViewInit() {
    this.setVar('index',     this.targetWidth('index'));
    this.setVar('citations', this.targetWidth('citations'));
  }

  private targetWidth(side: Side): number {
    if (side === 'index') return this.showIndex() ? this.indexWidth() : 0;
    if (!this.showCitations()) return 0;
    if (this.citationsExpanded()) return this.viewportWidth();
    return this.citationsWidth();
  }
  private viewportWidth(): number {
    return typeof window === 'undefined' ? 1280 : window.innerWidth;
  }

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
  private setVar(side: Side, w: number) {
    const host = this.hostEl.nativeElement;
    host.classList.remove(`anim-${side}`);
    host.style.setProperty(`--w-${side}`, `${w}px`);
  }

  toggleDark()        { this.darkMode.update(v => !v); }
  toggleIndex()       { this.showIndex.update(v => !v);     this.tween('index'); }
  toggleCitations()   {
    const next = !this.showCitations();
    this.showCitations.set(next);
    if (!next) this.citationsExpanded.set(false);
    this.tween('citations');
  }
  toggleExpanded(e?: Event) {
    e?.stopPropagation(); e?.preventDefault();
    this.showCitations.set(true);
    this.citationsExpanded.update(v => !v);
    this.tween('citations');
  }
  changeFont(d: number) { this.fontSize.set(Math.max(0, Math.min(4, this.fontSize() + d))); }

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
  @HostListener('window:resize')
  onWindowResize() {
    if (this.citationsExpanded() && this.showCitations()) {
      this.setVar('citations', this.viewportWidth());
    }
  }

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

  private loadRoots() {
    this.rootListLoading.set(true);
    this.api.getV2Roots({ source: this.activeSlug(), limit: 10000 }).pipe(
      catchError(() => of({ rows: [], total: 0, page: 1, limit: 0, has_more: false })),
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
    this.api.getClassicalRead(this.activeSlug(), root_norm).pipe(
      catchError(() => { this.error.set('تعذّر تحميل المادة'); return of(null); }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(v => {
      this.view.set(v);
      this.loading.set(false);
      queueMicrotask(() => this.contentRef?.nativeElement.scrollTo({ top: 0 }));
    });
  }

  openAyah(surah: number, ayah: number) {
    if (!surah || !ayah) return;
    this.router.navigate(['/quran/al-quran'], {
      queryParams: { surah, startingVerse: ayah },
    });
  }

  // Open + scroll-into-view a panel item in the right rail.
  scrollToPanelItem(panel: 'notes' | 'quran' | 'hadith' | 'poetry' | 'authorities',
                    selector: string) {
    if (!this.showCitations()) {
      this.showCitations.set(true);
      this.tween('citations');
    }
    setTimeout(() => {
      const host = this.contentRef?.nativeElement?.closest('.reader__body');
      if (!host) return;
      const det = host.querySelector<HTMLDetailsElement>(`.rail__panel--${panel}`);
      if (det && !det.open) det.open = true;
      const target = host.querySelector<HTMLElement>(selector);
      if (!target) return;
      const scroller = target.closest<HTMLElement>('.rail__scroll');
      if (scroller) {
        const tr = target.getBoundingClientRect();
        const sr = scroller.getBoundingClientRect();
        scroller.scrollTop = Math.max(0,
          scroller.scrollTop + (tr.top - sr.top) - scroller.clientHeight / 2 + tr.height / 2);
      } else target.scrollIntoView({ block: 'center' });
      target.classList.add('fn-list__item--focused');
      setTimeout(() => target.classList.remove('fn-list__item--focused'), 2400);
    }, 120);
  }

  openFootnoteInPanel(payload: { num: number }) {
    this.scrollToPanelItem('notes', `.fn-list__item[data-fn-num="${payload.num}"]`);
  }
  openAuthorityInPanel(payload: { name: string }) {
    const safe = payload.name.replace(/"/g, '\\"');
    this.scrollToPanelItem('authorities', `.auth-list__item[data-auth-name="${safe}"]`);
  }

  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    switch (e.key) {
      case 'ArrowLeft':  this.nextRoot(); e.preventDefault(); break;
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
