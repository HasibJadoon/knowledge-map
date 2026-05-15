import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import {
  QuranResearchApiService,
  QrTafsirDisplaySource,
  QrTafsirGroupDisplayPayload,
  QrTafsirDisplayBlock,
} from '../../../../shared/services/quran-research-api.service';
import { BackendApiService } from '../../../../shared/services/backend-api.service';
import { QuranReaderService } from '../../../../shared/services/quran/quran-reader.service';
import { QuranResearchSearchService } from '../quran-research-search.service';
import { ReadingStateService } from '../reading-state.service';
import { ContinueReadingCardComponent } from '../components/continue-reading-card/continue-reading-card.component';
import { DisplayBlockComponent } from '../../../../shared/components/display-block/display-block.component';
import { RefsModalComponent } from '../../../../shared/components/refs-modal/refs-modal.component';

interface ScholarColumn {
  source: QrTafsirDisplaySource;
  blocks: QrTafsirDisplayBlock[];
}

/** Minimal surah-menu shape this page needs (mapped from QuranSurahListItem). */
interface SurahListItem {
  id: number;
  name_ar: string;
  ayah_count: number;
}

interface AyahPreview {
  surah: number; ayah: number;
  text_display: string;
  translation: string | null;
  verse_mark: string | null;
  page_number: number | null;
}

/**
 * Ionic tafseer reader — rewritten to consume qr_tafsir_book_display_*
 * (migration 012) via /qr/tafsir/display.
 *
 * All data from D1:
 *   • source list ← /qr/tafsir/display/sources
 *   • surahs + ayah counts ← /qr/menu (via QuranReaderService.getSurahs)
 *   • display blocks ← /qr/tafsir/display
 *
 * Single-source deep view (selectedSource) OR multi-scholar (no selection).
 * Madhab + era filters available either way.
 */
@Component({
  selector: 'app-tafseer-page',
  standalone: true,
  imports: [CommonModule, IonicModule, ContinueReadingCardComponent, DisplayBlockComponent, RefsModalComponent],
  templateUrl: './tafseer-page.component.html',
  styleUrl: './tafseer-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TafseerPageComponent implements OnInit {
  private readonly api          = inject(QuranResearchApiService);
  private readonly backend      = inject(BackendApiService);
  private readonly quranReader  = inject(QuranReaderService);
  private readonly search       = inject(QuranResearchSearchService);
  private readonly router       = inject(Router);
  private readonly destroyRef   = inject(DestroyRef);
  private readonly readingState = inject(ReadingStateService);

  readonly sources        = signal<QrTafsirDisplaySource[]>([]);
  readonly loading        = signal(true);
  readonly selectedSource = signal<QrTafsirDisplaySource | null>(null);

  readonly surahMenu     = signal<SurahListItem[]>([]);
  readonly selectedSurah = signal(1);
  readonly selectedAyah  = signal(1);

  readonly payload        = signal<QrTafsirGroupDisplayPayload | null>(null);
  readonly payloadLoading = signal(false);
  readonly payloadError   = signal<string | null>(null);

  readonly madhabFilter = signal<string | null>(null);
  readonly eraFilter    = signal<string | null>(null);

  readonly filteredSources = computed(() => {
    const q = this.search.searchTerm().trim().toLowerCase();
    if (!q) return this.sources();
    return this.sources().filter(s =>
      `${s.book_title_ar ?? ''} ${s.book_title_en ?? ''} ${s.author_name_ar ?? ''} ${s.author_name_en ?? ''} ${s.madhab ?? ''} ${s.era ?? ''}`.toLowerCase().includes(q),
    );
  });

  readonly currentSurahMeta = computed<SurahListItem | null>(
    () => this.surahMenu().find(s => s.id === this.selectedSurah()) ?? null,
  );
  readonly ayahCount = computed(() => this.currentSurahMeta()?.ayah_count ?? 1);

  readonly columns = computed<ScholarColumn[]>(() => {
    const p = this.payload();
    if (!p) return [];
    const sourceFilter = this.selectedSource()?.scholar_id;
    const madhab = this.madhabFilter();
    const era    = this.eraFilter();
    const byScholar = new Map<string, QrTafsirDisplayBlock[]>();
    for (const b of p.blocks) {
      const sid = b.scholar_id ?? 'unknown';
      if (sourceFilter && sid !== sourceFilter) continue;
      if (madhab && b.madhab !== madhab) continue;
      if (era && b.era !== era) continue;
      if (!byScholar.has(sid)) byScholar.set(sid, []);
      byScholar.get(sid)!.push(b);
    }
    return p.sources
      .filter(s => byScholar.has(s.scholar_id ?? ''))
      .map(s => ({ source: s, blocks: byScholar.get(s.scholar_id ?? '') ?? [] }));
  });

  readonly groupHeader = computed(() => {
    const p = this.payload();
    if (!p) return '';
    return p.ayah_keys.length > 1
      ? `سورة ${p.surah_no} • ${p.ayah_group_key}`
      : `سورة ${p.surah_no} • آية ${p.ayah_no}`;
  });

  readonly availableMadhabs = computed(() => {
    const set = new Set<string>();
    for (const s of this.sources()) if (s.madhab) set.add(s.madhab);
    return [...set].sort();
  });

  constructor() {
    effect(() => {
      const src = this.selectedSource();
      const surah = this.selectedSurah();
      const ayah  = this.selectedAyah();
      if (!src) return;
      this.loadPayload(surah, ayah);
    });

    // Persist last-read tafseer position.
    effect(() => {
      const src = this.selectedSource();
      const surah = this.selectedSurah();
      const ayah  = this.selectedAyah();
      if (!src) return;
      this.readingState.setLastTafseer(
        src.work_id ?? src.id,
        src.book_title_ar ?? src.source_slug,
        surah,
        ayah,
      );
    });

    // Cross-tab search broadcast.
    effect(() => {
      const term = this.search.searchTerm().trim();
      if (!term) { this.search.setMatch('tafseer', null); return; }
      const matches = this.filteredSources();
      this.search.setMatch('tafseer', {
        tab: 'tafseer',
        label: 'تفسير',
        count: matches.length,
        hits: matches.slice(0, 5).map(s => ({
          id: s.id,
          title: s.book_title_ar ?? s.source_slug,
          subtitle: s.author_name_ar ?? null,
          resume: () => this.selectSource(s),
        })),
      });
    });
  }

  ngOnInit(): void {
    this.api.getTafsirDisplaySources()
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

  readonly lastReadTafseer = computed(() => {
    const last = this.readingState.last()['tafseer'];
    return last && last.kind === 'tafseer' ? last : null;
  });

  resumeLast(): void {
    const last = this.lastReadTafseer();
    if (!last) return;
    const src = this.sources().find(s => (s.work_id ?? s.id) === last.workId);
    if (!src) return;
    this.selectedSource.set(src);
    this.selectedSurah.set(last.surah);
    this.selectedAyah.set(last.ayah);
  }

  selectSource(s: QrTafsirDisplaySource): void {
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
  setMadhab(m: string | null): void { this.madhabFilter.set(m); }
  setEra(e: string | null): void    { this.eraFilter.set(e); }

  private loadPayload(surah: number, ayah: number): void {
    this.payloadLoading.set(true);
    this.payloadError.set(null);
    const src = this.selectedSource();
    const opts: { scholar_id?: string } = {};
    if (src?.scholar_id) opts.scholar_id = src.scholar_id;
    this.api.getTafsirDisplay(surah, ayah, opts)
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

  // ── References & backlinks modal ──────────────────────────────────────────
  readonly refsModalOpen = signal(false);
  openRefs(): void  { this.refsModalOpen.set(true); }
  closeRefs(): void { this.refsModalOpen.set(false); }

  // ── Ayah preview modal (preserved)
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
      .subscribe(data => { this.ayahPreview.set(data); this.ayahModalLoading.set(false); });
  }
  closeAyahModal(): void { this.ayahModalOpen.set(false); }
  goToAyah(surah: number, ayah: number): void {
    this.closeAyahModal();
    this.router.navigate(['/quran/al-quran'], { queryParams: { surah, startingVerse: ayah } });
  }
}
