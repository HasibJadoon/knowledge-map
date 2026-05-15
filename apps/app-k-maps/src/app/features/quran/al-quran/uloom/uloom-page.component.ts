import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import {
  QuranResearchApiService,
  QrIraabDisplaySource,
  QrIraabGroupDisplayPayload,
  QrIraabDisplayBlock,
} from '../../../../shared/services/quran-research-api.service';
import { BackendApiService } from '../../../../shared/services/backend-api.service';
import { QuranReaderService } from '../../../../shared/services/quran/quran-reader.service';
import { QuranResearchSearchService } from '../quran-research-search.service';
import { ReadingStateService } from '../reading-state.service';
import { ContinueReadingCardComponent } from '../components/continue-reading-card/continue-reading-card.component';
import { DisplayBlockComponent } from '../../../../shared/components/display-block/display-block.component';

interface SourceSection {
  source: QrIraabDisplaySource;
  groups: SectionGroup[];
}

/** Minimal surah-menu shape this page needs (mapped from QuranSurahListItem). */
interface SurahListItem {
  id: number;
  name_ar: string;
  ayah_count: number;
}

export interface SectionGroup {
  key: string;
  label_ar: string;
  label_en: string;
  heading_block: QrIraabDisplayBlock | null;
  children: QrIraabDisplayBlock[];
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

function groupBlocksBySection(blocks: QrIraabDisplayBlock[]): SectionGroup[] {
  const byKey = new Map<string, SectionGroup>();
  const ensure = (key: string): SectionGroup => {
    if (byKey.has(key)) return byKey.get(key)!;
    const meta = SECTION_LABELS[key] ?? { ar: key, en: key, order: 99 };
    const g: SectionGroup = { key, label_ar: meta.ar, label_en: meta.en, order: meta.order, heading_block: null, children: [] };
    byKey.set(key, g);
    return g;
  };
  for (const b of blocks) {
    const key = sectionOf(b);
    const g = ensure(key);
    if (b.block_type === 'heading') g.heading_block = b;
    else g.children.push(b);
  }
  for (const g of byKey.values()) g.children.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  return [...byKey.values()].sort((a, b) => a.order - b.order);
}

interface AyahPreview {
  surah: number; ayah: number;
  text_display: string;
  translation: string | null;
  verse_mark: string | null;
  page_number: number | null;
}

/**
 * Ionic uloom (iʿrāb) reader — rewritten to consume the new
 * qr_iraab_book_display_* layer (migration 011) via /qr/iraab/display.
 *
 * Everything in this page comes from D1:
 *   • source registry      ← /qr/iraab/display/sources
 *   • surah list + ayah counts ← /qr/menu (via QuranReaderService.getSurahs)
 *   • display blocks       ← /qr/iraab/display
 *
 * No hardcoded lists, no Array.from({length: 114}). Adding a new iʿrāb source
 * to D1 makes it appear here automatically.
 */
@Component({
  selector: 'app-uloom-page',
  standalone: true,
  imports: [CommonModule, IonicModule, ContinueReadingCardComponent, DisplayBlockComponent],
  templateUrl: './uloom-page.component.html',
  styleUrl: './uloom-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UloomPageComponent implements OnInit {
  private readonly api          = inject(QuranResearchApiService);
  private readonly backend      = inject(BackendApiService);
  private readonly quranReader  = inject(QuranReaderService);
  private readonly search       = inject(QuranResearchSearchService);
  private readonly router       = inject(Router);
  private readonly destroyRef   = inject(DestroyRef);
  private readonly readingState = inject(ReadingStateService);

  // ── Source catalog ────────────────────────────────────────────────────────
  readonly sources        = signal<QrIraabDisplaySource[]>([]);
  readonly loading        = signal(true);
  readonly selectedSource = signal<QrIraabDisplaySource | null>(null);

  // ── Surah/ayah navigation (from D1) ───────────────────────────────────────
  readonly surahMenu     = signal<SurahListItem[]>([]);
  readonly selectedSurah = signal(1);
  readonly selectedAyah  = signal(1);

  // ── Display payload ───────────────────────────────────────────────────────
  readonly payload        = signal<QrIraabGroupDisplayPayload | null>(null);
  readonly payloadLoading = signal(false);
  readonly payloadError   = signal<string | null>(null);

  readonly filteredSources = computed(() => {
    const q = this.search.searchTerm().trim().toLowerCase();
    if (!q) return this.sources();
    return this.sources().filter(s =>
      `${s.book_title_ar ?? ''} ${s.book_title_en ?? ''} ${s.author_name_ar ?? ''} ${s.author_name_en ?? ''}`.toLowerCase().includes(q),
    );
  });

  readonly currentSurahMeta = computed<SurahListItem | null>(
    () => this.surahMenu().find(s => s.id === this.selectedSurah()) ?? null,
  );
  readonly ayahCount = computed(() => this.currentSurahMeta()?.ayah_count ?? 1);

  /** Per-source feed for the current ayah group. */
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
      .map(s => ({ source: s, groups: groupBlocksBySection(bySource.get(s.source_slug) ?? []) }));
  });

  // Collapse state per (source_slug, section_key).
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
    // Refetch on (source × surah × ayah) change.
    effect(() => {
      const src = this.selectedSource();
      const surah = this.selectedSurah();
      const ayah  = this.selectedAyah();
      if (!src) return;
      this.loadPayload(surah, ayah);
    });

    // Persist last-read iʿrāb position.
    effect(() => {
      const src = this.selectedSource();
      const surah = this.selectedSurah();
      const ayah  = this.selectedAyah();
      if (!src) return;
      this.readingState.setLastUloom(src.source_slug, src.book_title_ar ?? src.source_slug, surah, ayah);
    });

    // Cross-tab search broadcast.
    effect(() => {
      const term = this.search.searchTerm().trim();
      if (!term) { this.search.setMatch('uloom', null); return; }
      const matches = this.filteredSources();
      this.search.setMatch('uloom', {
        tab: 'uloom',
        label: 'علوم',
        count: matches.length,
        hits: matches.slice(0, 5).map(s => ({
          id: s.id,
          title: s.book_title_ar ?? s.source_slug,
          subtitle: s.book_title_en ?? null,
          resume: () => this.selectSource(s),
        })),
      });
    });
  }

  ngOnInit(): void {
    this.api.getIraabDisplaySources()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => { this.sources.set(res.sources); this.loading.set(false); },
        error: () => this.loading.set(false),
      });

    this.quranReader.getSurahs()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(res => this.surahMenu.set(
        (res.surahs ?? []).map(s => ({
          id: s.surahNumber,
          name_ar: s.arabicName,
          ayah_count: s.ayahCount,
        })),
      ));
  }

  readonly lastReadUloom = computed(() => {
    const last = this.readingState.last()['uloom'];
    return last && last.kind === 'uloom' ? last : null;
  });

  resumeLast(): void {
    const last = this.lastReadUloom();
    if (!last) return;
    const src = this.sources().find(s => s.source_slug === last.sourceSlug);
    if (!src) return;
    this.selectedSource.set(src);
    this.selectedSurah.set(last.surah);
    this.selectedAyah.set(last.ayah);
  }

  selectSource(s: QrIraabDisplaySource): void {
    this.selectedSource.set(s);
    this.selectedSurah.set(1);
    this.selectedAyah.set(1);
    this.payload.set(null);
  }
  closeSource(): void { this.selectedSource.set(null); this.payload.set(null); }
  setSurah(s: number): void { this.selectedSurah.set(s); this.selectedAyah.set(1); }
  setAyah(a: number): void { this.selectedAyah.set(Math.max(1, Math.min(this.ayahCount(), a))); }
  prevAyah(): void { this.setAyah(this.selectedAyah() - 1); }
  nextAyah(): void { this.setAyah(this.selectedAyah() + 1); }

  private loadPayload(surah: number, ayah: number): void {
    this.payloadLoading.set(true);
    this.payloadError.set(null);
    const slug = this.selectedSource()?.source_slug;
    this.api.getIraabDisplay(surah, ayah, slug ? { source_slug: slug } : {})
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: p => { this.payload.set(p); this.payloadLoading.set(false); },
        error: e => {
          this.payload.set(null);
          this.payloadError.set(e?.message ?? 'لا توجد بيانات للآية المطلوبة');
          this.payloadLoading.set(false);
        },
      });
  }

  // ── Ayah preview modal (preserved from old uloom)
  readonly ayahModalOpen    = signal(false);
  readonly ayahModalLoading = signal(false);
  readonly ayahPreview      = signal<AyahPreview | null>(null);
  readonly skeletonRows     = Array.from({ length: 3 });

  openAyah(surah: number, ayah: number): void {
    if (!surah || !ayah) return;
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
  goToAyah(surah: number, ayah: number): void {
    this.closeAyahModal();
    this.router.navigate(['/quran/al-quran'], { queryParams: { surah, startingVerse: ayah } });
  }
}
