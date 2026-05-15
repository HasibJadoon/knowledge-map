import {
  Component, OnInit, inject, signal, computed,
  ElementRef, ViewChild, AfterViewInit, effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import gsap from 'gsap';
import { QuranResearchApiService } from '../../../../../shared/services/quran/quran-research-api.service';
import { QuranApiService } from '../../../../../shared/services/quran/quran-api.service';
import type {
  QrIraabDisplaySource,
  QrIraabGroupDisplayPayload,
  QrIraabDisplayBlock,
  QrMenuSurah,
} from '../../../../../shared/models/quran/qr.models';
import { DisplayBlockComponent } from '../../../../../shared/components/display-block/display-block.component';
import { RefsPanelComponent } from '../../../../../shared/components/refs-panel/refs-panel.component';
import { IraabAnalysisPanelComponent } from '../../../../../shared/components/iraab-analysis-panel/iraab-analysis-panel.component';

interface SourceSection {
  source: QrIraabDisplaySource;
  groups: SectionGroup[];
}

/**
 * One section (irab/sarf/balagha/fawaid/…) with its heading + children blocks.
 * Renders as a collapsible parent card with the children as beads on a thread.
 */
export interface SectionGroup {
  key: string;
  label_ar: string;
  label_en: string;
  heading_block: QrIraabDisplayBlock | null;
  children: QrIraabDisplayBlock[];
  /** Sort priority for the section. */
  order: number;
}

const SECTION_LABELS: Record<string, { ar: string; en: string; order: number }> = {
  irab:      { ar: 'الإعراب',  en: 'Iʿrāb',                 order: 0 },
  sarf:      { ar: 'الصرف',    en: 'Ṣarf',                  order: 1 },
  balagha:   { ar: 'البلاغة',  en: 'Balāgha',               order: 2 },
  fawaid:    { ar: 'الفوائد',  en: 'Fawāʾid (Insights)',    order: 3 },
  language:  { ar: 'اللغة',     en: 'Language & Etymology', order: 4 },
  dep_graph: { ar: 'الشجرة الإعرابية', en: 'Dependency Tree', order: 9 },
};

function sectionOf(b: QrIraabDisplayBlock): string {
  if (b.block_type === 'irab_card') return 'irab';
  if (b.block_type === 'dependency_graph') return 'dep_graph';
  if (b.block_type === 'heading' && b.block_subtype) return b.block_subtype;
  if (b.block_type === 'sarf_note')      return 'sarf';
  if (b.block_type === 'balagha_note')   return 'balagha';
  if (b.block_type === 'key_insight')    return 'fawaid';
  if (b.block_type === 'language_note')  return 'language';
  if (b.block_subtype) return b.block_subtype;
  return 'irab';
}

/** Group flat block list into section parent-child trees. */
function groupBlocksBySection(blocks: QrIraabDisplayBlock[]): SectionGroup[] {
  const byKey = new Map<string, SectionGroup>();

  const ensure = (key: string): SectionGroup => {
    if (byKey.has(key)) return byKey.get(key)!;
    const meta = SECTION_LABELS[key] ?? { ar: key, en: key, order: 99 };
    const g: SectionGroup = {
      key, label_ar: meta.ar, label_en: meta.en, order: meta.order,
      heading_block: null, children: [],
    };
    byKey.set(key, g);
    return g;
  };

  for (const b of blocks) {
    const key = sectionOf(b);
    const g = ensure(key);
    if (b.block_type === 'heading') g.heading_block = b;
    else g.children.push(b);
  }

  // Sort children within each group by display_order
  for (const g of byKey.values()) {
    g.children.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  }

  return [...byKey.values()].sort((a, b) => a.order - b.order);
}

/**
 * Uloom — iʿrāb reader. Wired to the new qr_iraab_book_display_* layer
 * (migration 011) and consumes /qr/iraab/display + /qr/iraab/display/sources.
 *
 * All data (sources, surah list, ayah counts, blocks, scholar metadata) is
 * fetched from D1 via the worker API. Nothing about the corpus is hardcoded
 * client-side — adding new sources or changing ayah counts only needs an
 * ingestion + the UI updates automatically.
 */
@Component({
  selector: 'km-uloom-page',
  standalone: true,
  imports: [CommonModule, DisplayBlockComponent, RefsPanelComponent, IraabAnalysisPanelComponent],
  templateUrl: './uloom-page.component.html',
  styleUrl: './uloom-page.component.scss',
})
export class UloomPageComponent implements OnInit, AfterViewInit {
  @ViewChild('grid')    grid?: ElementRef<HTMLElement>;
  @ViewChild('reader')  reader?: ElementRef<HTMLElement>;

  // ── Book-style chrome state (mirrors lexicon-shell pattern) ───────────────
  /** Rail visibility. CSS var `--w-rail` drives the actual width on .reader. */
  readonly showRail   = signal(true);
  /** Manuscript dark mode — toggles .dark class on the .reader section. */
  readonly darkMode   = signal(true);
  /** Font size step: 0 = small, 1 = medium, 2 = large. */
  readonly fontSize   = signal(1);
  readonly fontSizeClass = computed(() => ['fs-sm', 'fs-md', 'fs-lg'][this.fontSize()]);

  /** Default rail width when shown. */
  private readonly RAIL_W = 300;

  /**
   * GSAP-driven rail toggle. Animates the CSS custom property `--w-rail`
   * on the .reader host element. The CSS rules use this var to size both
   * the rail (width) and the content (padding-inline-start), so the
   * content reflows in lockstep with the rail width. Mirrors the
   * lexicon-shell pattern but uses GSAP instead of class-toggle transitions.
   */
  toggleRail(): void {
    const willShow = !this.showRail();
    this.showRail.set(willShow);
    const host = this.reader?.nativeElement;
    if (!host) return;
    const target = willShow ? this.RAIL_W : 0;
    gsap.to(host, {
      '--w-rail': `${target}px`,
      duration: 0.48,
      ease: 'expo.out',
    });
  }

  toggleDark(): void { this.darkMode.update(v => !v); }
  changeFont(d: number): void { this.fontSize.set(Math.max(0, Math.min(2, this.fontSize() + d))); }

  private readonly api      = inject(QuranResearchApiService);
  private readonly quranApi = inject(QuranApiService);

  // ── Source catalog ────────────────────────────────────────────────────────
  readonly sources        = signal<QrIraabDisplaySource[]>([]);
  readonly loading        = signal(true);
  readonly searchTerm     = signal('');
  readonly selectedSource = signal<QrIraabDisplaySource | null>(null);

  // ── Surah/ayah navigation (from D1) ───────────────────────────────────────
  readonly surahMenu     = signal<QrMenuSurah[]>([]);
  readonly selectedSurah = signal<number>(1);
  readonly selectedAyah  = signal<number>(1);

  // ── Modern surah/ayah picker UI state ─────────────────────────────────────
  /** Whether the surah picker dropdown is open. */
  readonly surahPickerOpen = signal(false);
  /** Filter text inside the surah picker (matches id or name). */
  readonly surahFilter     = signal('');
  /** Quick-jump input value, accepts forms like "2:255" or "2 255". */
  readonly goToInput       = signal('');

  /** Filtered surah list for the picker dropdown. */
  readonly filteredSurahs = computed(() => {
    const q = this.surahFilter().trim().toLowerCase();
    const list = this.surahMenu();
    if (!q) return list;
    return list.filter(s =>
      String(s.id) === q ||
      String(s.id).startsWith(q) ||
      (s.name_ar ?? '').toLowerCase().includes(q) ||
      (s.name_en ?? '').toLowerCase().includes(q) ||
      (s.name_transliteration ?? '').toLowerCase().includes(q),
    );
  });

  openSurahPicker(): void {
    this.surahFilter.set('');
    this.surahPickerOpen.set(true);
  }
  closeSurahPicker(): void { this.surahPickerOpen.set(false); }
  pickSurah(id: number): void {
    this.setSurah(id);
    this.closeSurahPicker();
  }

  /** Set ayah from a direct number input. */
  onAyahInput(value: string): void {
    const n = parseInt(value, 10);
    if (Number.isFinite(n)) this.setAyah(n);
  }

  /** Parse "S:A" or "S A" quick-jump input and navigate. */
  submitGoTo(): void {
    const raw = this.goToInput().trim();
    if (!raw) return;
    const m = raw.match(/^(\d{1,3})\s*[:\s]\s*(\d{1,3})$/);
    if (!m) return;
    const s = parseInt(m[1], 10);
    const a = parseInt(m[2], 10);
    if (s < 1 || s > 114) return;
    this.setSurah(s);
    // Wait for surahMenu to provide the new ayah_count, then clamp the ayah
    queueMicrotask(() => this.setAyah(a));
    this.goToInput.set('');
  }

  // ── Per-ayah display payload ──────────────────────────────────────────────
  readonly payload         = signal<QrIraabGroupDisplayPayload | null>(null);
  readonly payloadLoading  = signal(false);
  readonly payloadError    = signal<string | null>(null);

  readonly filteredSources = computed(() => {
    const q = this.searchTerm().toLowerCase().trim();
    if (!q) return this.sources();
    return this.sources().filter(s =>
      `${s.book_title_ar ?? ''} ${s.book_title_en ?? ''} ${s.author_name_ar ?? ''} ${s.author_name_en ?? ''}`.toLowerCase().includes(q),
    );
  });

  /** Current surah's metadata from the API. */
  readonly currentSurahMeta = computed<QrMenuSurah | null>(
    () => this.surahMenu().find(s => s.id === this.selectedSurah()) ?? null,
  );

  /** Ayah count for the current surah — driven by D1, not hardcoded. */
  readonly ayahCount = computed(() => this.currentSurahMeta()?.ayah_count ?? 1);

  /** Per-source feed grouped into parent-child section groups. */
  readonly sections = computed<SourceSection[]>(() => {
    const p = this.payload();
    if (!p) return [];
    const filter = this.selectedSource()?.source_slug;
    const bySource = new Map<string, QrIraabDisplayBlock[]>();
    for (const b of p.blocks) {
      if (filter && b.source_slug !== filter) continue;
      if (!bySource.has(b.source_slug)) bySource.set(b.source_slug, []);
      bySource.get(b.source_slug)!.push(b);
    }
    return p.sources
      .filter(s => bySource.has(s.source_slug))
      .map(s => ({
        source: s,
        groups: groupBlocksBySection(bySource.get(s.source_slug) ?? []),
      }));
  });

  // ── Collapse state per (source_slug, section_key) ─────────────────────────
  /** Set of `${source_slug}|${section_key}` for currently-collapsed sections. */
  readonly collapsed = signal<Set<string>>(new Set());

  isCollapsed(sourceSlug: string, sectionKey: string): boolean {
    return this.collapsed().has(`${sourceSlug}|${sectionKey}`);
  }
  toggleSection(sourceSlug: string, sectionKey: string): void {
    this.collapsed.update(set => {
      const next = new Set(set);
      const k = `${sourceSlug}|${sectionKey}`;
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  }

  readonly groupHeader = computed(() => {
    const p = this.payload();
    if (!p) return '';
    return p.ayah_keys.length > 1
      ? `سورة ${p.surah_no} • مجموعة ${p.ayah_group_key}`
      : `سورة ${p.surah_no} • آية ${p.ayah_no}`;
  });

  constructor() {
    // Whenever surah or ayah or source filter changes, refetch the payload.
    effect(() => {
      const src = this.selectedSource();
      const surah = this.selectedSurah();
      const ayah  = this.selectedAyah();
      if (!src) return;
      this.loadPayload(surah, ayah);
    });
  }

  ngOnInit(): void {
    // 1) Source registry from D1
    this.api.getIraabDisplaySources().subscribe({
      next: res => { this.sources.set(res.sources); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    // 2) Surah list (with ayah counts) from D1 — replaces the hardcoded 1..114
    this.quranApi.getMenu().subscribe({
      next: res => { if (res?.data?.surahs) this.surahMenu.set(res.data.surahs); },
    });
  }

  ngAfterViewInit(): void {
    this.animateGrid();
    // Seed the rail-width CSS var on the .reader host so layout is correct
    // on first paint. Subsequent toggles are GSAP-tweened.
    const host = this.reader?.nativeElement;
    if (host) host.style.setProperty('--w-rail', (this.showRail() ? this.RAIL_W : 0) + 'px');
  }

  setSearch(value: string): void { this.searchTerm.set(value); }

  selectSource(src: QrIraabDisplaySource): void {
    this.selectedSource.set(src);
    this.selectedSurah.set(1);
    this.selectedAyah.set(1);
    this.payload.set(null);
  }

  closeSource(): void {
    this.selectedSource.set(null);
    this.payload.set(null);
  }

  setSurah(surah: number): void {
    this.selectedSurah.set(surah);
    this.selectedAyah.set(1);
  }

  setAyah(ayah: number): void {
    const max = this.ayahCount();
    this.selectedAyah.set(Math.max(1, Math.min(max, ayah)));
  }

  prevAyah(): void { this.setAyah(this.selectedAyah() - 1); }
  nextAyah(): void { this.setAyah(this.selectedAyah() + 1); }

  private loadPayload(surah: number, ayah: number): void {
    this.payloadLoading.set(true);
    this.payloadError.set(null);
    const slug = this.selectedSource()?.source_slug;
    this.api.getIraabDisplay(surah, ayah, slug ? { source_slug: slug } : {}).subscribe({
      next: p => { this.payload.set(p); this.payloadLoading.set(false); },
      error: e => {
        this.payload.set(null);
        this.payloadError.set(e?.message ?? 'لا توجد بيانات للآية المطلوبة');
        this.payloadLoading.set(false);
      },
    });
  }

  private animateGrid(): void {
    const cards = Array.from(
      this.grid?.nativeElement.querySelectorAll<HTMLElement>('.source-card') ?? [],
    );
    if (!cards.length) return;
    gsap.fromTo(
      cards,
      { opacity: 0, y: 22 },
      { opacity: 1, y: 0, duration: 0.38, stagger: 0.05, ease: 'power3.out', delay: 0.08, clearProps: 'transform' },
    );
  }
}
