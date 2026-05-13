// ─── Lane shell ────────────────────────────────────────────────────────────
// Wraps the bilingual lane-reader in the same dockview layout (left rail
// = root index, right rail = authorities + Quran refs + cross-refs).
// Data shape is genuinely different from the classical-lexicon shell
// (verb-form-keyed sections, scholarly sigla, English/Arabic interleave)
// so Lane gets its own shell instead of sharing.

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
  AlDictionaryApiService, LexV2RootRow, LaneReadView, LaneToken,
} from '../../../../shared/services/al-dictionary-api.service';
import { LaneReaderComponent } from '../../lane-reader/lane-reader.component';

export const LANE_SLUG = 'lane_lexicon';

const RAIL = {
  INDEX_DEFAULT: 320, INDEX_MIN: 220, INDEX_MAX: 480,
  CITATIONS_DEFAULT: 380, CITATIONS_MIN: 280, CITATIONS_MAX: 720,
};
const DUR_WIDTH = 480;
const DUR_FADE  = 320;
type Side = 'index' | 'citations';

@Component({
  selector: 'km-lane-shell',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LaneReaderComponent],
  templateUrl: './lane-shell.component.html',
  styleUrl: './lane-shell.component.scss',
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
export class LaneShellComponent implements AfterViewInit {
  @ViewChild('content',       { static: false }) contentRef?:       ElementRef<HTMLElement>;
  @ViewChild('indexRail',     { static: false }) indexRailRef?:     ElementRef<HTMLElement>;
  @ViewChild('citationsRail', { static: false }) citationsRailRef?: ElementRef<HTMLElement>;

  private readonly hostEl     = inject(ElementRef<HTMLElement>);
  private readonly api        = inject(AlDictionaryApiService);
  private readonly route      = inject(ActivatedRoute);
  private readonly router     = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly currentRoot = signal('');
  readonly loading     = signal(false);
  readonly view        = signal<LaneReadView | null>(null);
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
      arr.push(r); out.set(letter, arr);
    }
    return [...out.entries()].sort();
  });

  readonly copyState = signal<'idle' | 'copied' | 'failed'>('idle');

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
        if (slug !== LANE_SLUG) return;
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
    if (this.citationsExpanded()) return typeof window === 'undefined' ? 1280 : window.innerWidth;
    return this.citationsWidth();
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
    this.dragSide = side;
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
    this.api.getV2Roots({ source: LANE_SLUG, limit: 10000 }).pipe(
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
    this.api.getLaneRead(root_norm).pipe(
      catchError(() => { this.error.set('Could not load entry'); return of(null); }),
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
  openCrossRef(target: string) {
    // Same source, different root
    this.goToRoot(target);
  }

  // ── Copy entire root entry as plain text ──────────────────────────────
  //
  // Converts the token stream into bilingual Arabic+English prose
  // suitable for pasting into notes, citations, or Anki cards. Sigla are
  // surfaced as `(M, Ṣ)`, Quran refs as `[2:143]`, and form/sense headers
  // get classical numeric labels (I., II., A1., A2.).
  copyRoot() {
    const v = this.view();
    if (!v) return;

    const lines: string[] = [];
    lines.push(`${v.meta.title_ar} / ${v.meta.title_en}`);
    const pages = v.entry.page_start
      ? ` (pp. ${v.entry.page_start}-${v.entry.page_end})`
      : '';
    lines.push(`Root: ${v.entry.root_text}${pages}`);
    lines.push('');

    const roman = (n: number | null): string => {
      if (!n) return '';
      const m: [number, string][] = [
        [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
      ];
      let r = ''; let x = n;
      for (const [v, s] of m) while (x >= v) { r += s; x -= v; }
      return r;
    };

    for (const f of v.forms) {
      const num = f.form_num ? `${roman(f.form_num)}. ` : '';
      const page = f.page_no ? `  (p. ${f.page_no})` : '';
      lines.push(`${num}${f.form_label_ar ?? ''}${page}`.trim());
      for (const s of f.senses) {
        const label = s.label ? `${s.label}. ` : '';
        const body = this.tokensToText(s.tokens);
        if (body) lines.push(`  ${label}${body}`);
      }
      lines.push('');
    }

    const text = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    this.writeClipboard(text);
  }

  private tokensToText(tokens: LaneToken[]): string {
    const parts: string[] = [];
    for (const t of tokens) {
      switch (t.kind) {
        case 'text':       parts.push(t.value); break;
        case 'arabic':     parts.push(t.value); break;
        case 'headword':   parts.push(t.value); break;
        case 'siglum':     parts.push(`(${t.raw})`); break;
        case 'cross_ref':  parts.push(`→${t.target}`); break;
        case 'quran':      parts.push(`[${t.surah}:${t.ayah}]`); break;
        case 'figurative': parts.push('‡'); break;
        case 'br':         parts.push('\n'); break;
      }
    }
    return parts.join('').replace(/\s+/g, ' ').trim();
  }

  private writeClipboard(text: string) {
    const finish = (state: 'copied' | 'failed') => {
      this.copyState.set(state);
      window.setTimeout(() => this.copyState.set('idle'), 1800);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => finish('copied'))
        .catch(() => finish('failed'));
      return;
    }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      finish('copied');
    } catch { finish('failed'); }
  }
}
