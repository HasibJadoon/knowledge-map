// ─── Unified mobile lexicon reader ────────────────────────────────────────
//
// One page handles every source kind in the catalog:
//   • Lane                  (lane_lexicon)            → getLaneRead
//   • Classical lexicons    (lisan / taj / sihah / …) → getV2Entry
//   • Mufradat al-Raghib    (ketabonline_al_raghib_*) → getMufradatRead
//   • Academic scholarship  (aljallad_… and future)   → getScholarshipBySource
//
// Layout: a single header toolbar (back arrow · book title · roots-picker icon)
// with an always-visible Ionic searchbar underneath for word/root lookup
// inside the open source. The full alphabetical roots index is reached via
// the title-bar icon (ion-popover). Entry text is selectable for copy.

import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, HostBinding,
  OnDestroy, ViewChild, computed, effect, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { IonicModule, ToastController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest, of, catchError } from 'rxjs';
import {
  AlDictionaryApiService,
  LaneReadView, LaneToken,
  LexV2EntryDetail, LexV2RootRow, LexV2Section,
  MufradatReadView, MufradatProseToken,
  ScholarshipShellView, ScholarshipRootRow,
} from '../../../../shared/services/al-dictionary-api.service';
import { BackendApiService } from '../../../../shared/services/backend-api.service';
import { VerseDisplayComponent } from '../../../../shared/components/verse-display/verse-display.component';
import { hapticTick, hapticTap } from '../../../../shared/utils/haptics.util';
import { ImmersiveService } from '../immersive.service';
import { ReadingStateService } from '../reading-state.service';

interface AyahPreview {
  surah:        number;
  ayah:         number;
  text_display: string;
  translation:  string | null;
  verse_mark:   string | null;
  page_number:  number | null;
}

export type SourceKind = 'lane' | 'classical' | 'mufradat' | 'scholarship';

const CLASSICAL_LEXICON_SLUGS = new Set<string>([
  'ketabonline_ibn_manzur_lisan_al_arab',
  'ketabonline_al_zabidi_taj_al_arus',
  'ketabonline_al_jawhari_al_sihah',
  'saaid_maqayis_al_lugha',
  'qomra_al_qamus_al_muhit',
  'qomra_al_ubab_al_zakhir',
  'qomra_al_misbah_al_munir',
  'qomra_jamharat_al_lugha',
  'thahabi_al_khalil_kitab_al_ayn',
  'ketabonline_al_fayyumi_misbah_munir',
  'ketabonline_ibn_duraid_jamharat_al_lugha',
]);
const LANE_SLUGS = new Set<string>(['lane_lexicon', 'lane_quranic_research_perseus']);
const MUFRADAT_SLUG = 'ketabonline_al_raghib_mufradat';

function sourceKind(slug: string): SourceKind {
  if (LANE_SLUGS.has(slug))             return 'lane';
  if (slug === MUFRADAT_SLUG)           return 'mufradat';
  if (CLASSICAL_LEXICON_SLUGS.has(slug)) return 'classical';
  return 'scholarship';
}

// Display-shape carried by the header. Each kind's `loadEntry` resolves
// `meta` so the toolbar can show title + author + year uniformly.
interface SourceMeta {
  slug:     string;
  kind:     SourceKind;
  title_ar: string;
  title_en: string;
  author:   string;
  period:   string;
  year:     number | null;
  genre_ar: string | null;
  genre:    string | null;
}

@Component({
  selector: 'app-lexicon-reader-page',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, VerseDisplayComponent],
  templateUrl: './lexicon-reader-page.component.html',
  styleUrl: './lexicon-reader-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LexiconReaderPageComponent implements OnDestroy {
  @ViewChild('content') contentRef?: ElementRef<HTMLElement>;

  private readonly api        = inject(AlDictionaryApiService);
  private readonly backend    = inject(BackendApiService);
  private readonly route      = inject(ActivatedRoute);
  private readonly router     = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastCtrl  = inject(ToastController);
  private readonly immersive  = inject(ImmersiveService);
  private readonly readingState = inject(ReadingStateService);

  /** Drive immersive-mode (auto-hide tab bar) from page scroll. */
  onContentScroll(ev: CustomEvent<{ scrollTop: number }>): void {
    this.immersive.onScroll(ev.detail?.scrollTop ?? 0);
  }

  ngOnDestroy(): void {
    this.immersive.exit();
  }

  // ── Font-scale control ──────────────────────────────────────────────────
  // Five-step scale (0.85, 0.95, 1.0, 1.10, 1.25) bound to the --lex-scale
  // CSS custom property on the host. _lexicon-tokens.scss multiplies every
  // --lex-fs-* value by --lex-scale, so this single signal resizes the
  // entire type hierarchy (title + body + chips + sheet text) in lockstep.
  // Persisted in localStorage under FONT_SCALE_KEY so the choice survives
  // navigation and app restarts. Renders A−/A·/A+ chips in the chips bar.
  private static readonly FONT_SCALE_KEY = 'km:lex:fontscale';
  private static readonly FONT_SCALE_STEPS = [0.85, 0.95, 1.0, 1.10, 1.25] as const;
  readonly fontScaleIndex = signal<number>(this.loadInitialFontScaleIndex());
  readonly fontScale = computed(() =>
    LexiconReaderPageComponent.FONT_SCALE_STEPS[this.fontScaleIndex()] ?? 1.0,
  );

  /** Bind the chosen scale to the host as a CSS variable. The tokens
   *  partial reads --lex-scale via calc() for every font-size token, so
   *  this single binding propagates to every descendant. */
  @HostBinding('style.--lex-scale')
  get fontScaleVar(): string { return String(this.fontScale()); }

  /** Persist scale changes; effect runs in injection context so it cleans
   *  up automatically when the component is destroyed. */
  private readonly persistFontScale = effect(() => {
    const idx = this.fontScaleIndex();
    try { localStorage.setItem(LexiconReaderPageComponent.FONT_SCALE_KEY, String(idx)); }
    catch { /* private mode / storage disabled — ignore */ }
  });

  private loadInitialFontScaleIndex(): number {
    try {
      const raw = localStorage.getItem(LexiconReaderPageComponent.FONT_SCALE_KEY);
      if (raw == null) return 2; // default: 1.0×
      const n = Number(raw);
      if (!Number.isFinite(n)) return 2;
      const max = LexiconReaderPageComponent.FONT_SCALE_STEPS.length - 1;
      return Math.max(0, Math.min(max, Math.trunc(n)));
    } catch { return 2; }
  }

  /** Step the scale by ±1; clamped to the scale array bounds. */
  bumpFontScale(delta: -1 | 1): void {
    const max = LexiconReaderPageComponent.FONT_SCALE_STEPS.length - 1;
    this.fontScaleIndex.update(i => Math.max(0, Math.min(max, i + delta)));
  }
  resetFontScale(): void { this.fontScaleIndex.set(2); }

  readonly canShrinkFont = computed(() => this.fontScaleIndex() > 0);
  readonly canGrowFont   = computed(() =>
    this.fontScaleIndex() < LexiconReaderPageComponent.FONT_SCALE_STEPS.length - 1,
  );

  // ── Ayah preview modal
  readonly ayahModalOpen    = signal(false);
  readonly ayahModalLoading = signal(false);
  readonly ayahPreview      = signal<AyahPreview | null>(null);

  // ── Footnote sheet
  readonly footnoteModalOpen   = signal(false);
  readonly footnoteFocusedNum  = signal<number | null>(null);

  // ── Routing state
  readonly slug        = signal<string>('');
  readonly currentRoot = signal<string>('');
  readonly rootSearch  = signal<string>('');

  // ── Roots-picker popover state
  readonly rootsPickerOpen = signal(false);
  rootsPickerEvent: Event | null = null;

  // ── Loading / error
  readonly loading = signal(false);
  readonly error   = signal<string | null>(null);

  // ── Per-kind payloads
  readonly laneView        = signal<LaneReadView | null>(null);
  readonly classicalView   = signal<LexV2EntryDetail | null>(null);
  readonly mufradatView    = signal<MufradatReadView | null>(null);
  readonly scholarshipView = signal<ScholarshipShellView | null>(null);

  // ── Root index (one of two shapes depending on kind)
  readonly v2Roots          = signal<LexV2RootRow[]>([]);
  readonly scholarshipRoots = signal<ScholarshipRootRow[]>([]);
  readonly rootsLoading     = signal(false);

  // ── Derived
  readonly kind = computed<SourceKind>(() => sourceKind(this.slug()));

  readonly meta = computed<SourceMeta | null>(() => {
    const slug = this.slug();
    if (!slug) return null;
    const kind = this.kind();
    if (kind === 'lane' && this.laneView()) {
      const m = this.laneView()!.meta;
      return { slug, kind, title_ar: m.title_ar, title_en: m.title_en,
        author: m.author, period: m.period, year: null,
        genre_ar: null, genre: null };
    }
    if (kind === 'classical' && this.classicalView()) {
      const m = this.classicalView()!.meta;
      return { slug, kind, title_ar: m.title_ar, title_en: m.title_en,
        author: m.author, period: m.period, year: null,
        genre_ar: null, genre: null };
    }
    if (kind === 'mufradat' && this.mufradatView()) {
      const m = this.mufradatView()!.meta;
      return { slug, kind, title_ar: m.title_ar, title_en: m.title_en,
        author: m.author, period: m.period, year: null,
        genre_ar: null, genre: null };
    }
    if (kind === 'scholarship' && this.scholarshipView()?.source) {
      const s = this.scholarshipView()!.source!;
      return { slug, kind, title_ar: s.title_ar, title_en: s.title_en,
        author: s.author, period: s.year ? String(s.year) : '',
        year: s.year, genre_ar: s.genre_label?.ar ?? null, genre: s.genre };
    }
    return { slug, kind, title_ar: '', title_en: '', author: '',
      period: '', year: null, genre_ar: null, genre: null };
  });

  // Unified root list for the index (display shape).
  readonly rootList = computed<{ root_norm: string; root_text: string | null; page_no: number | null }[]>(() => {
    if (this.kind() === 'scholarship') {
      return this.scholarshipRoots().map(r => ({
        root_norm: r.root_norm, root_text: r.root_text, page_no: r.page_no,
      }));
    }
    return this.v2Roots().map(r => ({
      root_norm: r.root_norm, root_text: r.root_text ?? null, page_no: r.page_start,
    }));
  });

  readonly filteredRoots = computed(() => {
    const q = this.rootSearch().trim();
    const all = this.rootList();
    if (!q) return all;
    return all.filter(r =>
      r.root_norm.includes(q) || (r.root_text ?? '').includes(q),
    );
  });

  // Trimmed result set for the inline search dropdown — keeps the DOM small
  // when scanning through Lane's 37 K roots.
  readonly searchResults = computed(() =>
    this.rootSearch().trim() ? this.filteredRoots().slice(0, 80) : [],
  );
  readonly searchResultsTotal = computed(() =>
    this.rootSearch().trim() ? this.filteredRoots().length : 0,
  );

  // Grouped by letter for the index (small alphabetical accordion). Roots
  // are sorted by root_norm so each letter has a contiguous block.
  readonly rootsByLetter = computed(() => {
    const out = new Map<string, { root_norm: string; root_text: string | null; page_no: number | null }[]>();
    for (const r of this.rootList()) {
      const letter = (r.root_norm ?? '?')[0] ?? '?';
      const arr = out.get(letter) ?? [];
      arr.push(r);
      out.set(letter, arr);
    }
    return [...out.entries()].sort(([a], [b]) => a.localeCompare(b));
  });

  readonly currentRootIndex = computed(() => {
    const cur = this.currentRoot();
    return this.rootList().findIndex(r => r.root_norm === cur);
  });

  // ── Constructor: subscribe to route changes
  constructor() {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed())
      .subscribe(([params, query]) => {
        const slug = (params.get('slug') ?? '').trim();
        const root = (query.get('root') ?? '').trim();

        if (!slug) return;

        const slugChanged = slug !== this.slug();
        this.slug.set(slug);

        if (slugChanged) {
          // Reset all per-kind payloads and re-fetch roots for this source.
          this.laneView.set(null);
          this.classicalView.set(null);
          this.mufradatView.set(null);
          this.scholarshipView.set(null);
          this.v2Roots.set([]);
          this.scholarshipRoots.set([]);
          this.rootSearch.set('');
          this.loadRoots(slug);
        }

        if (root) {
          this.currentRoot.set(root);
          this.loadEntry(slug, root);
        }
      });
  }

  // ── Loading
  private loadRoots(slug: string): void {
    this.rootsLoading.set(true);
    if (sourceKind(slug) === 'scholarship') {
      this.api.getScholarshipRoots(slug).pipe(
        catchError(() => of({ slug, rows: [] as ScholarshipRootRow[], total: 0 })),
        takeUntilDestroyed(this.destroyRef),
      ).subscribe(r => {
        this.scholarshipRoots.set(r.rows);
        this.rootsLoading.set(false);
        // Auto-select first root if URL didn't include one.
        if (!this.currentRoot() && r.rows[0]) this.selectRoot(r.rows[0].root_norm, false);
      });
    } else {
      // Use a generous limit so even Lane's ~37K-row index loads in one shot.
      this.api.getV2Roots({ source: slug, limit: 50000 }).pipe(
        catchError(() => of({ rows: [] as LexV2RootRow[], total: 0, page: 1, limit: 0, has_more: false })),
        takeUntilDestroyed(this.destroyRef),
      ).subscribe(r => {
        this.v2Roots.set(r.rows);
        this.rootsLoading.set(false);
        if (!this.currentRoot() && r.rows[0]) this.selectRoot(r.rows[0].root_norm, false);
      });
    }
  }

  private loadEntry(slug: string, root_norm: string): void {
    this.loading.set(true);
    this.error.set(null);
    const kind = sourceKind(slug);

    const finish = () => {
      this.loading.set(false);
      queueMicrotask(() => this.contentRef?.nativeElement.scrollTo({ top: 0 }));
      // Persist last-read for the lexicon tab whenever an entry resolves.
      const m = this.meta();
      this.readingState.setLastLexicon(slug, m?.title_ar ?? null, root_norm);
    };

    const onErr = (err: unknown) => {
      this.error.set(this.errorMessageFor(err, root_norm));
      return of(null);
    };

    if (kind === 'lane') {
      this.api.getLaneRead(root_norm).pipe(
        catchError(onErr),
        takeUntilDestroyed(this.destroyRef),
      ).subscribe(v => { this.laneView.set(v); finish(); });
    } else if (kind === 'classical') {
      this.api.getV2Entry(slug, root_norm).pipe(
        catchError(onErr),
        takeUntilDestroyed(this.destroyRef),
      ).subscribe(v => { this.classicalView.set(v); finish(); });
    } else if (kind === 'mufradat') {
      this.api.getMufradatRead(root_norm).pipe(
        catchError(onErr),
        takeUntilDestroyed(this.destroyRef),
      ).subscribe(v => { this.mufradatView.set(v); finish(); });
    } else {
      this.api.getScholarshipBySource(slug, root_norm).pipe(
        catchError(onErr),
        takeUntilDestroyed(this.destroyRef),
      ).subscribe(v => { this.scholarshipView.set(v); finish(); });
    }
  }

  /** Map an API error to a user-readable Arabic message. The lexicon v2
   *  backend returns 500 for both "root not in this lexicon" and "real
   *  server fault" — we can't disambiguate from the client, but for
   *  unusually short root strings (1 character) we surface a more
   *  useful "no entry" message because that's the most common cause. */
  private errorMessageFor(err: unknown, root: string): string {
    const status = err instanceof HttpErrorResponse ? err.status : 0;
    if (status === 404) return 'هذا الجذر غير موجود في هذا المصدر.';
    if (status === 0)   return 'تعذّر الاتصال بالخادم.';
    if (status >= 500 && root.length < 2) {
      return 'لا توجد مادة لهذا الجذر في هذا المصدر.';
    }
    return 'تعذّر تحميل المادة';
  }

  // ── User interactions
  selectRoot(root_norm: string, replaceUrl = false): void {
    if (!replaceUrl) void hapticTick();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { root: root_norm },
      queryParamsHandling: 'merge',
      replaceUrl,
    });
    this.rootSearch.set('');
    this.rootsPickerOpen.set(false);
  }

  prevRoot(): void {
    const idx = this.currentRootIndex();
    if (idx > 0) this.selectRoot(this.rootList()[idx - 1].root_norm);
  }
  nextRoot(): void {
    const idx = this.currentRootIndex();
    const list = this.rootList();
    if (idx >= 0 && idx < list.length - 1) this.selectRoot(list[idx + 1].root_norm);
  }

  goBack(): void {
    const active = document.activeElement as HTMLElement | null;
    active?.blur?.();
    this.router.navigate(['/quran/al-quran/lexicon/books']);
  }

  /** Reactive: is the current entry (slug + root) bookmarked? */
  readonly isBookmarked = computed(() => {
    const slug = this.slug();
    const root = this.currentRoot();
    if (!slug || !root) return false;
    return this.readingState.bookmarks().some(b =>
      b.target.kind === 'lexicon' && b.target.slug === slug && b.target.root === root,
    );
  });

  toggleBookmark(): void {
    const slug = this.slug();
    const root = this.currentRoot();
    if (!slug || !root) return;
    const m = this.meta();
    const label = (m?.title_ar ? m.title_ar + ' · ' : '') + 'جذر ' + root;
    void hapticTick();
    this.readingState.toggleBookmark(label, {
      kind: 'lexicon',
      slug,
      bookTitleAr: m?.title_ar ?? null,
      root,
      updatedAt: Date.now(),
    });
  }

  // Open the ayah in an inline preview modal. Guards against re-opening
  // when a modal is already presenting (Ionic otherwise stacks duplicates).
  openAyah(surah: number, ayah: number): void {
    if (!surah || !ayah) return;
    if (this.ayahModalOpen()) return;
    void hapticTap();
    this.ayahPreview.set(null);
    this.ayahModalOpen.set(true);
    this.ayahModalLoading.set(true);
    this.backend.getData<AyahPreview>('qr', ['ayahs', surah, ayah])
      .pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
      .subscribe(data => {
        this.ayahPreview.set(data);
        this.ayahModalLoading.set(false);
      });
  }

  closeAyahModal(): void { this.ayahModalOpen.set(false); }

  // ── Footnote sheet ─────────────────────────────────────────────────────
  // Unified footnote list across kinds. Mufradat surfaces them on the view;
  // Classical lexicons store footnotes as blocks (block_type === 'footnote').
  // Lane / Scholarship currently have none.
  readonly footnoteList = computed<{ num: number; text: string | null; printed_page: number | null }[]>(() => {
    const k = this.kind();
    if (k === 'mufradat') {
      return this.mufradatView()?.footnotes ?? [];
    }
    if (k === 'classical') {
      const blocks = this.classicalView()?.blocks ?? [];
      return blocks
        .filter(b => b.block_type === 'footnote')
        .map(b => ({
          num: b.block_seq,
          text: b.text_plain,
          printed_page: b.printed_page,
        }));
    }
    return [];
  });

  openFootnotes(num?: number): void {
    if (!this.footnoteList().length) return;
    this.footnoteFocusedNum.set(num ?? null);
    this.footnoteModalOpen.set(true);
  }

  closeFootnoteModal(): void {
    this.footnoteModalOpen.set(false);
    this.footnoteFocusedNum.set(null);
  }

  // ── Aggregated-content modals (Quran cites / Hadith / Poetry / Authorities)
  // Bottom-sheet modals that surface the per-entry aggregations the API
  // already returns. Triggered by chips in the entry header — chips only
  // appear when their list has at least one item.
  readonly quranCitesModalOpen  = signal(false);
  readonly hadithModalOpen      = signal(false);
  readonly poetryModalOpen      = signal(false);
  readonly authoritiesModalOpen = signal(false);

  /** Unified Quran citation list across the three source kinds that expose
   *  them. Field shapes differ on the wire (lane.context_snippet vs
   *  mufradat.raw) so we normalise to a single display row. */
  readonly quranCitesList = computed<{ surah: number; ayah: number; snippet: string | null }[]>(() => {
    const k = this.kind();
    if (k === 'lane') {
      return (this.laneView()?.quran_citations ?? []).map(c => ({
        surah: c.surah, ayah: c.ayah, snippet: c.context_snippet,
      }));
    }
    if (k === 'classical') {
      return (this.classicalView()?.quran_refs ?? []).map(c => ({
        surah: c.surah, ayah: c.ayah, snippet: c.context_snippet,
      }));
    }
    if (k === 'mufradat') {
      return (this.mufradatView()?.quran_citations ?? []).map(c => ({
        surah: c.surah_num ?? 0, ayah: c.ayah, snippet: c.raw,
      }));
    }
    return [];
  });

  /** Hadith quotes — Mufradat surfaces them as paragraph kind='hadith'. */
  readonly hadithList = computed<{ cue: string | null; text: string }[]>(() => {
    if (this.kind() !== 'mufradat') return [];
    const out: { cue: string | null; text: string }[] = [];
    for (const s of this.mufradatView()?.sections ?? []) {
      for (const p of s.paragraphs) {
        if (p.kind === 'hadith') {
          const text = (p.tokens ?? []).map(t => ('value' in t ? t.value : '')).join('').trim();
          out.push({ cue: p.cue, text });
        }
      }
    }
    return out;
  });

  /** Poetry shawahid — Mufradat surfaces them as paragraph kind='poetry'
   *  with cue + verses[] + attribution. */
  readonly poetryList = computed<{ cue: string | null; verses: string[]; attribution: string | null }[]>(() => {
    if (this.kind() !== 'mufradat') return [];
    const out: { cue: string | null; verses: string[]; attribution: string | null }[] = [];
    for (const s of this.mufradatView()?.sections ?? []) {
      for (const p of s.paragraphs) {
        if (p.kind === 'poetry') {
          out.push({ cue: p.cue, verses: p.verses, attribution: p.attribution });
        }
      }
    }
    return out;
  });

  /** Authorities (sigla) — Lane only; the bilingual XML carries them as
   *  scholarly attribution codes mapped to full names. */
  readonly authoritiesList = computed<{ code: string; name_en: string; name_ar: string; count: number }[]>(() => {
    if (this.kind() !== 'lane') return [];
    return this.laneView()?.authorities ?? [];
  });

  openQuranCites():   void { if (this.quranCitesList().length)   this.quranCitesModalOpen.set(true); }
  openHadith():       void { if (this.hadithList().length)       this.hadithModalOpen.set(true); }
  openPoetry():       void { if (this.poetryList().length)       this.poetryModalOpen.set(true); }
  openAuthorities():  void { if (this.authoritiesList().length)  this.authoritiesModalOpen.set(true); }

  closeQuranCitesModal():  void { this.quranCitesModalOpen.set(false); }
  closeHadithModal():      void { this.hadithModalOpen.set(false); }
  closePoetryModal():      void { this.poetryModalOpen.set(false); }
  closeAuthoritiesModal(): void { this.authoritiesModalOpen.set(false); }

  goToAyah(surah: number, ayah: number): void {
    this.closeAyahModal();
    this.router.navigate(['/quran/al-quran'], {
      queryParams: { surah, startingVerse: ayah },
    });
  }

  // ── Roots picker
  openRootsPicker(ev: Event): void {
    this.rootsPickerEvent = ev;
    this.rootsPickerOpen.set(true);
  }
  closeRootsPicker(): void {
    this.rootsPickerOpen.set(false);
  }

  // Copy a root's text (Arabic glyphs preferred) to the clipboard.
  async copyRoot(ev: Event, root: { root_norm: string; root_text: string | null }): Promise<void> {
    ev.stopPropagation();
    const text = (root.root_text ?? root.root_norm).trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      const t = await this.toastCtrl.create({
        message: `Copied "${text}"`,
        duration: 1200,
        position: 'bottom',
        cssClass: 'rdr-toast',
      });
      await t.present();
    } catch {
      // Clipboard API may be unavailable (e.g. insecure contexts). Fail silently.
    }
  }

  // Copy the full rendered entry text (every form, sense, token) to clipboard.
  async copyAll(): Promise<void> {
    const el = this.contentRef?.nativeElement;
    if (!el) return;
    const text = (el as HTMLElement).innerText?.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      const t = await this.toastCtrl.create({
        message: 'Entry copied to clipboard',
        duration: 1400,
        position: 'bottom',
        cssClass: 'rdr-toast',
      });
      await t.present();
    } catch { /* fail silently */ }
  }

  clearSearch(): void {
    this.rootSearch.set('');
  }

  // ── Body segmentation for inline "Q s:a" references (Mufradat / V2 /
  // scholarship plain-text bodies that mention Quran verses).
  bodySegments(text: string | null | undefined): {
    kind: 'text' | 'qref' | 'fn'; value: string; surah?: number; ayah?: number; fn?: number;
  }[] {
    if (!text) return [];
    // Match either a Quran ref (`Q.S:A`, `Q. S–A`) OR a footnote marker `(N)`.
    // Footnote markers in classical Arabic lexicons are bare parenthesized
    // numbers up to 3 digits, used inline like `إبابةً (69) .`. We restrict
    // to 1-3 digits to avoid catching year numbers (which classical texts
    // rarely embed mid-prose anyway).
    const RX = /\bQ\.?\s*(\d{1,3})\s*[:\-–]\s*(\d{1,3})\b|\((\d{1,3})\)/g;
    const out: { kind: 'text' | 'qref' | 'fn'; value: string; surah?: number; ayah?: number; fn?: number }[] = [];
    const fnSet = new Set(this.footnoteList().map(f => f.num));
    let cur = 0;
    let m: RegExpExecArray | null;
    while ((m = RX.exec(text)) != null) {
      let token: { kind: 'qref' | 'fn'; value: string; surah?: number; ayah?: number; fn?: number } | null = null;
      if (m[1] && m[2]) {
        const surah = parseInt(m[1], 10);
        const ayah  = parseInt(m[2], 10);
        if (!(surah >= 1 && surah <= 114 && ayah >= 1)) continue;
        token = { kind: 'qref', value: m[0], surah, ayah };
      } else if (m[3]) {
        const num = parseInt(m[3], 10);
        // Only treat as a footnote if this number actually exists in the
        // entry's footnote list — otherwise it's just a parenthesized
        // number in the prose (e.g., a verse count) and should stay text.
        if (!fnSet.has(num)) continue;
        token = { kind: 'fn', value: m[0], fn: num };
      }
      if (!token) continue;
      if (m.index > cur) out.push({ kind: 'text', value: text.slice(cur, m.index) });
      out.push(token);
      cur = m.index + m[0].length;
    }
    if (cur < text.length) out.push({ kind: 'text', value: text.slice(cur) });
    return out;
  }

  // ── Stats line (under the entry header)
  //
  // English labels with simple pluralisation. The metadata under the
  // headword is incidental (counts, not content) and the previous Arabic
  // labels added noise next to the Arabic-script root in the H1 above.
  // Counts use tabular-nums via the surrounding rule for stable widths.
  statsLine(): string {
    const k = this.kind();
    const p = (n: number, singular: string, plural?: string) =>
      `${n} ${n === 1 ? singular : (plural ?? singular + 's')}`;
    if (k === 'lane' && this.laneView()) {
      const s = this.laneView()!.stats;
      return [
        p(s.forms, 'form'),
        p(s.senses, 'sense'),
        p(s.quran_citations, 'Quran citation'),
        p(s.authorities, 'authority', 'authorities'),
      ].join(' · ');
    }
    if (k === 'classical' && this.classicalView()) {
      const s = this.classicalView()!.stats;
      return [
        p(s.sections, 'section'),
        p(s.blocks, 'paragraph'),
        p(s.quran_refs, 'Quran citation'),
      ].join(' · ');
    }
    if (k === 'mufradat' && this.mufradatView()) {
      const s = this.mufradatView()!.stats;
      return [
        p(s.paragraphs, 'paragraph'),
        p(s.poetry, 'poetic verse', 'poetic verses'),
        p(s.hadith, 'hadith'),
        p(s.quran_citations, 'Quran citation'),
      ].join(' · ');
    }
    if (k === 'scholarship' && this.scholarshipView()) {
      const v = this.scholarshipView()!;
      return p(v.notes.length, 'reading');
    }
    return '';
  }

  // Type-narrowing helpers for template
  asLaneToken(t: LaneToken): LaneToken { return t; }
  asMufradatToken(t: MufradatProseToken): MufradatProseToken { return t; }
  asSection(s: LexV2Section): LexV2Section { return s; }
}
