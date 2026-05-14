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
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, OnDestroy, ViewChild,
  computed, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
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

  /** Drive immersive-mode (auto-hide tab bar) from page scroll. */
  onContentScroll(ev: CustomEvent<{ scrollTop: number }>): void {
    this.immersive.onScroll(ev.detail?.scrollTop ?? 0);
  }

  ngOnDestroy(): void {
    this.immersive.exit();
  }

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
    };

    if (kind === 'lane') {
      this.api.getLaneRead(root_norm).pipe(
        catchError(() => { this.error.set('تعذّر تحميل المادة'); return of(null); }),
        takeUntilDestroyed(this.destroyRef),
      ).subscribe(v => { this.laneView.set(v); finish(); });
    } else if (kind === 'classical') {
      this.api.getV2Entry(slug, root_norm).pipe(
        catchError(() => { this.error.set('تعذّر تحميل المادة'); return of(null); }),
        takeUntilDestroyed(this.destroyRef),
      ).subscribe(v => { this.classicalView.set(v); finish(); });
    } else if (kind === 'mufradat') {
      this.api.getMufradatRead(root_norm).pipe(
        catchError(() => { this.error.set('تعذّر تحميل المادة'); return of(null); }),
        takeUntilDestroyed(this.destroyRef),
      ).subscribe(v => { this.mufradatView.set(v); finish(); });
    } else {
      this.api.getScholarshipBySource(slug, root_norm).pipe(
        catchError(() => { this.error.set('تعذّر تحميل المادة'); return of(null); }),
        takeUntilDestroyed(this.destroyRef),
      ).subscribe(v => { this.scholarshipView.set(v); finish(); });
    }
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
        message: `تم نسخ «${text}»`,
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
        message: 'تم نسخ المادة كاملة',
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
  statsLine(): string {
    const k = this.kind();
    if (k === 'lane' && this.laneView()) {
      const s = this.laneView()!.stats;
      return `${s.forms} صيغة · ${s.senses} معنى · ${s.quran_citations} استشهاد قرآني · ${s.authorities} مرجعًا`;
    }
    if (k === 'classical' && this.classicalView()) {
      const s = this.classicalView()!.stats;
      return `${s.sections} قسمًا · ${s.blocks} فقرة · ${s.quran_refs} استشهاد قرآني`;
    }
    if (k === 'mufradat' && this.mufradatView()) {
      const s = this.mufradatView()!.stats;
      return `${s.paragraphs} فقرة · ${s.poetry} شاهد شعري · ${s.hadith} حديث · ${s.quran_citations} آية`;
    }
    if (k === 'scholarship' && this.scholarshipView()) {
      const v = this.scholarshipView()!;
      return `${v.notes.length} قراءة`;
    }
    return '';
  }

  // Type-narrowing helpers for template
  asLaneToken(t: LaneToken): LaneToken { return t; }
  asMufradatToken(t: MufradatProseToken): MufradatProseToken { return t; }
  asSection(s: LexV2Section): LexV2Section { return s; }
}
