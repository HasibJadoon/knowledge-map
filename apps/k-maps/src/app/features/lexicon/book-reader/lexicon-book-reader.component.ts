import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, HostListener,
  ViewChild, computed, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest, switchMap, of, EMPTY, catchError } from 'rxjs';
import {
  AlDictionaryApiService,
  LexV2Block, LexV2EntryDetail, LexV2Footnote, LexV2Link, LexV2QuranRef,
  LexV2RootRow, LexV2Section, MufradatReadView,
} from '../../../shared/services/al-dictionary-api.service';
import { MufradatReaderComponent } from '../mufradat-reader/mufradat-reader.component';
import {
  MufradatShellComponent, MUFRADAT_SLUG,
} from '../shells/mufradat/mufradat-shell.component';
import {
  LexiconShellComponent, LISAN_SLUG,
} from '../shells/lexicon/lexicon-shell.component';
import {
  LaneShellComponent, LANE_SLUG,
} from '../shells/lane/lane-shell.component';

// All slugs served by the classical-lexicon composer (back-end at
// /al/lex/v2/read/<slug>/...). The Lisan shell renders the 5-panel UI
// identically across them — per-source variation lives entirely in
// the back-end composer's SOURCE_CONFIGS table.
const CLASSICAL_LEXICON_SLUGS = new Set<string>([
  LISAN_SLUG,
  'ketabonline_al_jawhari_al_sihah',
  'thahabi_al_khalil_kitab_al_ayn',
  'saaid_maqayis_al_lugha',
  'qomra_al_ubab_al_zakhir',
  'ketabonline_al_zabidi_taj_al_arus',
  'ketabonline_al_fayyumi_misbah_munir',
  'ketabonline_ibn_duraid_jamharat_al_lugha',
  'qomra_al_qamus_al_muhit',
]);

interface BlockNode {
  block: LexV2Block;
  children: BlockNode[];
  links: LexV2Link[];
  tags: string[];
  quranRefs: LexV2QuranRef[];
}

@Component({
  selector: 'km-lexicon-book-reader',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MufradatReaderComponent, MufradatShellComponent, LexiconShellComponent, LaneShellComponent],
  templateUrl: './lexicon-book-reader.component.html',
  styleUrl: './lexicon-book-reader.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.dark]':   'darkMode()',
    '[class.fs-sm]':  'fontSize() === 0',
    '[class.fs-md]':  'fontSize() === 1',
    '[class.fs-lg]':  'fontSize() === 2',
  },
})
export class LexiconBookReaderComponent {
  @ViewChild('content') contentRef?: ElementRef<HTMLElement>;

  private readonly api        = inject(AlDictionaryApiService);
  private readonly route      = inject(ActivatedRoute);
  private readonly router     = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  // ── State ─────────────────────────────────────────────────────────────
  readonly slug         = signal('');
  readonly currentRoot  = signal('');
  readonly loading      = signal(false);
  readonly entry        = signal<LexV2EntryDetail | null>(null);
  readonly mufradatView = signal<MufradatReadView | null>(null);
  readonly error        = signal<string | null>(null);

  readonly isMufradat = computed(() => this.slug() === MUFRADAT_SLUG);
  // Sources served by the classical-lexicon composer + Lisan-shell UI.
  // Adding a slug here automatically lights up the rich 5-panel reader
  // (Qur'ān · Footnotes · Hadith · Poetry · Authorities) for that source.
  readonly isClassicalLexicon = computed(() => CLASSICAL_LEXICON_SLUGS.has(this.slug()));
  readonly isLane     = computed(() => this.slug() === LANE_SLUG);
  readonly isLisan    = computed(() => this.slug() === LISAN_SLUG);

  // ── Unified display signals ─────────────────────────────────────────
  // Each per-source view (currently Mufradat; Lisan + others to follow)
  // produces its own payload shape. These computed signals normalize what
  // the chrome (toolbar, entry head, footer) needs across all sources.

  readonly displayMeta = computed(() =>
    this.mufradatView()?.meta ?? this.entry()?.meta ?? null);

  readonly displayEntry = computed(() =>
    this.mufradatView()?.entry ?? this.entry()?.entry ?? null);

  readonly displayCanonical = computed(() =>
    this.mufradatView()?.canonical ?? this.entry()?.canonical ?? null);

  readonly displayStatsLine = computed(() => {
    const m = this.mufradatView();
    if (m) return {
      sections: m.sections.length,
      paragraphs: m.stats.paragraphs,
      quran_refs: m.stats.quran_citations,
    };
    const e = this.entry();
    if (e) return {
      sections: e.stats.sections,
      paragraphs: e.stats.blocks,
      quran_refs: e.stats.quran_refs,
    };
    return null;
  });

  readonly hasContent = computed(() =>
    !!this.mufradatView() || !!this.entry());

  // Root index (left rail)
  readonly rootList     = signal<LexV2RootRow[]>([]);
  readonly rootListLoading = signal(false);
  readonly rootSearch   = signal('');

  // UI preferences
  readonly darkMode     = signal(true);
  readonly showLeftRail = signal(true);
  readonly showRightRail = signal(true);
  readonly rightRailExpanded = signal(false); // widens the right rail for comfortable reading
  readonly fontSize     = signal(1); // 0=small, 1=normal, 2=large
  readonly bilingualMode = signal<'ar' | 'both'>('ar');

  // Open footnote (popover)
  readonly openFootnoteId = signal<string | null>(null);

  // Selected block (for inline annotation later)
  readonly selectedBlockId = signal<string | null>(null);

  // ── Derived ───────────────────────────────────────────────────────────
  readonly tree = computed<BlockNode[]>(() => {
    const e = this.entry();
    if (!e) return [];
    const tagsByBlock = new Map<string, string[]>();
    for (const t of e.tags) {
      const arr = tagsByBlock.get(t.block_id) ?? [];
      arr.push(t.tag);
      tagsByBlock.set(t.block_id, arr);
    }
    const linksByBlock = new Map<string, LexV2Link[]>();
    for (const l of e.links) {
      const arr = linksByBlock.get(l.from_block_id) ?? [];
      arr.push(l);
      linksByBlock.set(l.from_block_id, arr);
    }
    const qrefByBlock = new Map<string, LexV2QuranRef[]>();
    for (const q of e.quran_refs) {
      if (!q.block_id) continue;
      const arr = qrefByBlock.get(q.block_id) ?? [];
      arr.push(q);
      qrefByBlock.set(q.block_id, arr);
    }

    const nodes = new Map<string, BlockNode>();
    const roots: BlockNode[] = [];
    for (const b of e.blocks) {
      nodes.set(b.id, {
        block: b, children: [],
        links: linksByBlock.get(b.id) ?? [],
        tags: tagsByBlock.get(b.id) ?? [],
        quranRefs: qrefByBlock.get(b.id) ?? [],
      });
    }
    for (const b of e.blocks) {
      const n = nodes.get(b.id)!;
      if (b.parent_block_id && nodes.has(b.parent_block_id)) {
        nodes.get(b.parent_block_id)!.children.push(n);
      } else {
        roots.push(n);
      }
    }
    return roots;
  });

  // Sections rendered as reader paragraphs. We trust the server-computed
  // `section.body.paragraphs` (built from `text_ar`) — falling back to a
  // local split if the server hasn't shipped the new field yet.
  readonly renderableSections = computed<{
    section: LexV2Section;
    paragraphs: string[];
  }[]>(() => {
    const e = this.entry();
    if (!e) return [];
    return e.sections.map(section => {
      const fromBody = section.body?.paragraphs ?? null;
      const paragraphs = (fromBody && fromBody.length > 0)
        ? fromBody
        : this.splitParagraphs(section.text_ar ?? '');
      return { section, paragraphs };
    });
  });

  // Footnote backing text, indexed by marker number for quick tooltip lookup.
  readonly footnotesByNum = computed<Map<number, LexV2Footnote>>(() => {
    const map = new Map<number, LexV2Footnote>();
    for (const f of this.entry()?.footnotes ?? []) map.set(f.num, f);
    return map;
  });

  footnoteText(num: number): string | null {
    return this.footnotesByNum().get(num)?.text || null;
  }

  private splitParagraphs(text: string): string[] {
    const flat = text.replace(/\s+/g, ' ').trim();
    if (!flat) return [];
    return flat.split(/(?<=[.!؟۔])\s+/u).map(p => p.trim()).filter(Boolean);
  }

  // All footnote markers found across the entry, in numeric order. When a
  // backing footnote block exists, `text` is populated — otherwise we still
  // surface the bare number so readers know what `[N]` markers reference.
  readonly footnoteEntries = computed<{
    num: number; text: string | null; printed_page: number | null;
  }[]>(() => {
    // Mufradat ships footnotes pre-aggregated by (printed_page, num) so a
    // multi-page entry surfaces both copies of "(( 5 ))" with their distinct
    // texts.
    const mv = this.mufradatView();
    if (mv) return mv.footnotes;

    const seen = new Map<number, string | null>();
    for (const f of this.entry()?.footnotes ?? []) {
      if (f && Number.isFinite(f.num)) seen.set(f.num, f.text || null);
    }
    for (const sec of this.entry()?.sections ?? []) {
      const refs = sec.body?.footnote_refs ?? this.scanFootnoteRefs(sec.text_ar);
      for (const n of refs) if (!seen.has(n)) seen.set(n, null);
    }
    return [...seen.entries()]
      .map(([num, text]) => ({ num, text, printed_page: null }))
      .sort((a, b) => a.num - b.num);
  });

  private scanFootnoteRefs(text: string | null | undefined): number[] {
    if (!text) return [];
    const out = new Set<number>();
    const re = /«\s*([0-9٠-٩]+)\s*»|\(\s*\(\s*([0-9٠-٩]+)\s*\)\s*\)/gu;
    const toAscii = (s: string) => s.replace(/[٠-٩]/g, ch => String.fromCharCode(0x30 + ch.charCodeAt(0) - 0x660));
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) != null) {
      const raw = m[1] ?? m[2];
      if (!raw) continue;
      const n = +toAscii(raw);
      if (Number.isFinite(n) && n > 0) out.add(n);
    }
    return [...out].sort((a, b) => a - b);
  }

  readonly authorityTags = computed(() => {
    const e = this.entry();
    if (!e) return [];
    const set = new Set<string>();
    for (const t of e.tags) {
      if (t.tag.startsWith('#authority:')) set.add(t.tag.slice('#authority:'.length));
    }
    return [...set].sort();
  });

  readonly filteredRoots = computed(() => {
    const q = this.rootSearch().trim();
    const all = this.rootList();
    if (!q) return all;
    return all.filter(r => r.root_norm.includes(q) || (r.root_text ?? '').includes(q));
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

  readonly fontSizeClass = computed(() => ['fs-sm', 'fs-md', 'fs-lg'][this.fontSize()]);

  // ── Lifecycle ─────────────────────────────────────────────────────────
  constructor() {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed())
      .subscribe(([params, query]) => {
        const slug = params.get('slug') ?? '';
        const root = query.get('root') ?? '';
        this.slug.set(slug);

        // Load root list for this book once per slug
        if (slug && this.rootList().length === 0) this.loadRoots(slug);

        if (slug && root) {
          this.loadEntry(slug, root);
        } else if (slug) {
          // No root specified → load first root once root list is ready
          if (this.rootList().length > 0) {
            this.goToRoot(this.rootList()[0].root_norm);
          }
        }
      });
  }

  private loadRoots(slug: string) {
    this.rootListLoading.set(true);
    // Fetch the full root index in one shot — even the largest lexicon
    // (Lisan ~9.2K) fits well under 10K rows.
    this.api.getV2Roots({ source: slug, limit: 10000 }).pipe(
      catchError(() => of({ rows: [], total: 0, page: 1, limit: 0, has_more: false })),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(r => {
      this.rootList.set(r.rows);
      this.rootListLoading.set(false);
      if (!this.currentRoot() && r.rows.length > 0) {
        this.goToRoot(r.rows[0].root_norm);
      }
    });
  }

  private loadEntry(slug: string, root_norm: string) {
    this.loading.set(true);
    this.error.set(null);
    this.currentRoot.set(root_norm);
    this.mufradatView.set(null);

    // Mufradat has its own composer endpoint that returns a richer, fully
    // typed reader view. Other sources still use the generic v2 entry.
    if (slug === MUFRADAT_SLUG) {
      this.api.getMufradatRead(root_norm).pipe(
        catchError(err => { this.error.set('تعذّر تحميل المادة'); return of(null); }),
        takeUntilDestroyed(this.destroyRef),
      ).subscribe(v => {
        this.mufradatView.set(v);
        this.entry.set(null);
        this.loading.set(false);
        this.openFootnoteId.set(null);
        queueMicrotask(() => this.contentRef?.nativeElement.scrollTo({ top: 0 }));
      });
      return;
    }

    this.api.getV2Entry(slug, root_norm).pipe(
      catchError(err => { this.error.set('تعذّر تحميل المادة'); return of(null); }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(e => {
      this.entry.set(e);
      this.loading.set(false);
      this.openFootnoteId.set(null);
      queueMicrotask(() => this.contentRef?.nativeElement.scrollTo({ top: 0 }));
    });
  }

  // ── Navigation ────────────────────────────────────────────────────────
  goToRoot(root_norm: string) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { root: root_norm },
      queryParamsHandling: 'merge',
      replaceUrl: false,
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

  // ── UI helpers ────────────────────────────────────────────────────────
  toggleFootnote(id: string) {
    this.openFootnoteId.set(this.openFootnoteId() === id ? null : id);
  }

  // Wrap a single LexV2Block in a BlockNode shape so the existing blockTpl
  // template (which expects {block, children, links, tags, quranRefs}) works
  // when invoked from the section-merged renderer.
  blockNodeFor(block: LexV2Block): BlockNode {
    const e = this.entry();
    const links = e?.links.filter(l => l.from_block_id === block.id) ?? [];
    const tags  = e?.tags.filter(t => t.block_id === block.id).map(t => t.tag) ?? [];
    const qrefs = e?.quran_refs.filter(q => q.block_id === block.id) ?? [];
    return { block, children: [], links, tags, quranRefs: qrefs };
  }

  toggleDark()      { this.darkMode.update(v => !v); }
  toggleLeftRail()  { this.showLeftRail.update(v => !v); }
  toggleRightRail() { this.showRightRail.update(v => !v); }
  toggleRightRailExpanded(e?: Event) {
    e?.stopPropagation();   // don't toggle the <details> when the button is inside <summary>
    e?.preventDefault();
    this.rightRailExpanded.update(v => !v);
    this.showRightRail.set(true);
  }
  changeFont(d: number) { this.fontSize.set(Math.max(0, Math.min(2, this.fontSize() + d))); }

  // Open the ayah in the mushaf reader. /quran/al-quran resolves the
  // (surah, verse) pair to the correct mushaf page via its query params.
  openAyah(surah: number, ayah: number) {
    if (!surah || !ayah) return;
    this.router.navigate(['/quran/al-quran'], {
      queryParams: { surah, startingVerse: ayah },
    });
  }

  /**
   * Inline footnote marker was clicked. Make sure the right rail is open,
   * expand the notes panel, scroll the matching row into view and pulse it.
   * `payload.printed_page` lets multi-page entries point at the *specific*
   * row when the same `num` repeats across pages.
   */
  openFootnoteInPanel(payload: { num: number; printed_page: number | null }) {
    this.showRightRail.set(true);

    // setTimeout(60) so Angular's OnPush change detection commits the rail
    // expansion before we measure the DOM. requestAnimationFrame is unreliable
    // in some testing environments.
    setTimeout(() => {
      const host = this.contentRef?.nativeElement?.closest('.reader__body');
      if (!host) return;
      const panel = host.querySelector<HTMLDetailsElement>('.rail__panel--notes');
      if (panel && !panel.open) panel.open = true;

      const exact = host.querySelector<HTMLElement>(
        `.fn-list__item[data-fn-num="${payload.num}"][data-fn-page="${payload.printed_page ?? ''}"]`,
      );
      const target =
        exact ??
        host.querySelector<HTMLElement>(`.fn-list__item[data-fn-num="${payload.num}"]`);
      if (!target) return;

      const scroller = target.closest<HTMLElement>('.rail__scroll');
      if (scroller) {
        // offsetTop walks up to the nearest positioned ancestor — for the
        // rail panels that's `.rail--right`, NOT `.rail__scroll`. Use rect
        // math so we always compute against the actual scroll container.
        const targetRect = target.getBoundingClientRect();
        const scrollerRect = scroller.getBoundingClientRect();
        const wantTop = Math.max(
          0,
          scroller.scrollTop
            + (targetRect.top - scrollerRect.top)
            - (scroller.clientHeight / 2)
            + (targetRect.height / 2),
        );
        // `scroll-behavior: smooth` on `.rail__scroll` makes the assignment
        // animate; setting scrollTop directly is the most reliable trigger.
        scroller.scrollTop = wantTop;
      } else {
        target.scrollIntoView({ block: 'center' });
      }

      target.classList.add('fn-list__item--focused');
      setTimeout(() => target.classList.remove('fn-list__item--focused'), 2400);
    }, 60);
  }

  // Render a section's text_ar as continuous prose, with Quran refs
  // [سورة/ آية] and footnote markers «N» / (N) turned into inline tokens.
  // No paragraph splitting — preserves the source book's flowing layout.
  inlineSegments(text: string | null | undefined): {
    kind: 'text' | 'qref' | 'fn' | 'br';
    value: string;
    surah?: string;
    ayah?: number;
    fn?: number;
  }[] {
    if (!text) return [];
    // Recognise both Western (0-9) and Arabic-Indic (٠-٩) digits.
    const D = '[\\d٠-٩]';
    // Quran-ref bracket :  [سورة/ آية]   or  [12/ 3]   etc.
    const Q  = `\\[\\s*([^\\]\\/]+?)\\s*\\/\\s*(${D}{1,3})(?:\\s*[-،]\\s*${D}+)?\\s*\\]`;
    // Footnote ref :  «N»,  ((N)),  (N),  N-  (at line start)
    const FN = `«\\s*(${D}+)\\s*»|\\(\\s*\\(\\s*(${D}+)\\s*\\)\\s*\\)|\\(\\s*(${D}+)\\s*\\)|(?:^|\\s)(${D}+)-(?=\\s)`;
    const RE = new RegExp(`${Q}|${FN}`, 'g');

    // Helper: ٠-٩ → 0-9
    const toAscii = (s: string) => s.replace(/[٠-٩]/g, ch => String.fromCharCode(0x30 + ch.charCodeAt(0) - 0x660));
    const out: any[] = [];
    let cur = 0;
    let m: RegExpExecArray | null;
    while ((m = RE.exec(text)) != null) {
      if (m.index > cur) {
        // Preserve internal line breaks but collapse runs of blanks
        const slice = text.slice(cur, m.index);
        const parts = slice.split(/\n+/);
        parts.forEach((p, i) => {
          if (p) out.push({ kind: 'text', value: p });
          if (i < parts.length - 1) out.push({ kind: 'br', value: '' });
        });
      }
      if (m[1] !== undefined) {
        out.push({ kind: 'qref', value: m[0], surah: m[1].trim(), ayah: +toAscii(m[2]) });
      } else if (m[3] !== undefined) {
        out.push({ kind: 'fn', value: m[0], fn: +toAscii(m[3]) });
      } else if (m[4] !== undefined) {
        out.push({ kind: 'fn', value: m[0], fn: +toAscii(m[4]) });
      } else if (m[5] !== undefined) {
        out.push({ kind: 'fn', value: m[0], fn: +toAscii(m[5]) });
      } else if (m[6] !== undefined) {
        out.push({ kind: 'fn', value: m[0], fn: +toAscii(m[6]) });
      }
      cur = m.index + m[0].length;
    }
    if (cur < text.length) {
      const slice = text.slice(cur);
      const parts = slice.split(/\n+/);
      parts.forEach((p, i) => {
        if (p) out.push({ kind: 'text', value: p });
        if (i < parts.length - 1) out.push({ kind: 'br', value: '' });
      });
    }
    return out;
  }

  // (legacy) Convert block text with «N» footnote refs into segments
  segmentsFor(block: LexV2Block, footnoteBlocks: BlockNode[]): {
    text: string; footnote?: BlockNode
  }[] {
    const text = block.text_plain ?? '';
    if (!text) return [{ text }];
    const fnMap = new Map<string, BlockNode>();
    for (const c of footnoteBlocks) {
      try {
        const dj = JSON.parse(c.block.data_json || '{}');
        if (dj.footnote_no != null) fnMap.set(String(dj.footnote_no), c);
      } catch { /* */ }
    }
    const re = /«\s*(\d+)\s*»|\((\d+)\)/g;
    const out: { text: string; footnote?: BlockNode }[] = [];
    let cursor = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) != null) {
      if (m.index > cursor) out.push({ text: text.slice(cursor, m.index) });
      const fn = m[1] ?? m[2];
      const fnNode = fnMap.get(fn);
      if (fnNode) out.push({ text: m[0], footnote: fnNode });
      else out.push({ text: m[0] });
      cursor = m.index + m[0].length;
    }
    if (cursor < text.length) out.push({ text: text.slice(cursor) });
    return out;
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────
  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if ((e.target as HTMLElement)?.tagName === 'INPUT' ||
        (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
    switch (e.key) {
      case 'ArrowLeft':  this.nextRoot(); e.preventDefault(); break;  // RTL
      case 'ArrowRight': this.prevRoot(); e.preventDefault(); break;
      case 'j': this.contentRef?.nativeElement.scrollBy({ top: 80,  behavior: 'smooth' }); break;
      case 'k': this.contentRef?.nativeElement.scrollBy({ top: -80, behavior: 'smooth' }); break;
      case '[':  this.toggleLeftRail(); break;
      case ']':  this.toggleRightRail(); break;
      case 'd':  this.toggleDark(); break;
      case '+':  this.changeFont(+1); break;
      case '-':  this.changeFont(-1); break;
    }
  }
}
