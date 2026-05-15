import {
  Component, OnInit, inject, signal, computed,
  ElementRef, ViewChild, AfterViewInit, effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import gsap from 'gsap';
import { QuranResearchApiService } from '../../../../../shared/services/quran/quran-research-api.service';
import { QuranApiService } from '../../../../../shared/services/quran/quran-api.service';
import type {
  QrTafsirDisplaySource,
  QrTafsirGroupDisplayPayload,
  QrTafsirDisplayBlock,
  QrMenuSurah,
} from '../../../../../shared/models/quran/qr.models';
import { DisplayBlockComponent } from '../../../../../shared/components/display-block/display-block.component';
import { RefsPanelComponent } from '../../../../../shared/components/refs-panel/refs-panel.component';
import { TafsirAnalysisPanelComponent } from '../../../../../shared/components/tafsir-analysis-panel/tafsir-analysis-panel.component';

interface ScholarColumn {
  source: QrTafsirDisplaySource;
  blocks: QrTafsirDisplayBlock[];
}

/**
 * Tafseer page — rewritten to consume the new qr_tafsir_book_display_* layer
 * (migration 012) via /qr/tafsir/display/sources + /qr/tafsir/display.
 *
 * All data (sources, surah list, ayah counts, blocks, scholar metadata,
 * madhab/era labels) is fetched from D1. The page presents:
 *   - source catalog grid (when no scholar selected)
 *   - single-scholar deep view OR multi-scholar side-by-side comparison
 *     (driven by selectedScholarIds set)
 */
@Component({
  selector: 'km-tafseer-page',
  standalone: true,
  imports: [CommonModule, DisplayBlockComponent, RefsPanelComponent, TafsirAnalysisPanelComponent],
  templateUrl: './tafseer-page.component.html',
  styleUrl: './tafseer-page.component.scss',
})
export class TafseerPageComponent implements OnInit, AfterViewInit {
  @ViewChild('grid')   grid?: ElementRef<HTMLElement>;
  @ViewChild('reader') reader?: ElementRef<HTMLElement>;

  // ── Book-style chrome state (mirrors lexicon-shell pattern) ───────────────
  readonly showRail = signal(true);
  readonly darkMode = signal(true);
  readonly fontSize = signal(1);
  readonly fontSizeClass = computed(() => ['fs-sm', 'fs-md', 'fs-lg'][this.fontSize()]);
  private readonly RAIL_W = 300;

  /** GSAP-driven rail toggle (animates --w-rail CSS var on .reader host). */
  toggleRail(): void {
    const willShow = !this.showRail();
    this.showRail.set(willShow);
    const host = this.reader?.nativeElement;
    if (!host) return;
    gsap.to(host, {
      '--w-rail': `${willShow ? this.RAIL_W : 0}px`,
      duration: 0.48,
      ease: 'expo.out',
    });
  }

  toggleDark(): void { this.darkMode.update(v => !v); }
  changeFont(d: number): void { this.fontSize.set(Math.max(0, Math.min(2, this.fontSize() + d))); }

  private readonly api      = inject(QuranResearchApiService);
  private readonly quranApi = inject(QuranApiService);

  // ── Source catalog ────────────────────────────────────────────────────────
  readonly sources       = signal<QrTafsirDisplaySource[]>([]);
  readonly loading       = signal(true);
  readonly searchTerm    = signal('');
  readonly selectedSource = signal<QrTafsirDisplaySource | null>(null);

  // ── Surah/ayah navigation (D1) ────────────────────────────────────────────
  readonly surahMenu     = signal<QrMenuSurah[]>([]);
  readonly selectedSurah = signal<number>(1);
  readonly selectedAyah  = signal<number>(1);

  // ── Modern surah/ayah picker UI state (mirrors uloom) ─────────────────────
  readonly surahPickerOpen = signal(false);
  readonly surahFilter     = signal('');
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
    queueMicrotask(() => this.setAyah(a));
    this.goToInput.set('');
  }

  // ── Display payload + filters ─────────────────────────────────────────────
  readonly payload         = signal<QrTafsirGroupDisplayPayload | null>(null);
  readonly payloadLoading  = signal(false);
  readonly payloadError    = signal<string | null>(null);

  // Optional multi-scholar mode (when no source selected, show all)
  readonly madhabFilter    = signal<string | null>(null);
  readonly eraFilter       = signal<string | null>(null);

  readonly filteredSources = computed(() => {
    const q = this.searchTerm().toLowerCase().trim();
    if (!q) return this.sources();
    return this.sources().filter(s =>
      `${s.book_title_ar ?? ''} ${s.book_title_en ?? ''} ${s.author_name_ar ?? ''} ${s.author_name_en ?? ''} ${s.era ?? ''} ${s.madhab ?? ''}`.toLowerCase().includes(q),
    );
  });

  readonly currentSurahMeta = computed<QrMenuSurah | null>(
    () => this.surahMenu().find(s => s.id === this.selectedSurah()) ?? null,
  );
  readonly ayahCount = computed(() => this.currentSurahMeta()?.ayah_count ?? 1);

  /** Multi-scholar column layout. */
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
      // When source selected: bootstrap to ayah 1 of surah 1, then load.
      const src = this.selectedSource();
      if (!src) return;
      const surah = this.selectedSurah();
      const ayah  = this.selectedAyah();
      this.loadPayload(surah, ayah);
    });
  }

  ngOnInit(): void {
    this.api.getTafsirDisplaySources().subscribe({
      next: res => { this.sources.set(res.sources); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.quranApi.getMenu().subscribe({
      next: res => { if (res?.data?.surahs) this.surahMenu.set(res.data.surahs); },
    });
  }

  ngAfterViewInit(): void {
    this.animateGrid();
    const host = this.reader?.nativeElement;
    if (host) host.style.setProperty('--w-rail', (this.showRail() ? this.RAIL_W : 0) + 'px');
  }

  setSearch(value: string): void { this.searchTerm.set(value); }

  selectSource(src: QrTafsirDisplaySource): void {
    this.selectedSource.set(src);
    this.selectedSurah.set(1);
    this.selectedAyah.set(1);
    this.payload.set(null);
  }

  closeSource(): void {
    this.selectedSource.set(null);
    this.payload.set(null);
  }

  setSurah(surah: number): void { this.selectedSurah.set(surah); this.selectedAyah.set(1); }
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
    this.api.getTafsirDisplay(surah, ayah, opts).subscribe({
      next: p => { this.payload.set(p); this.payloadLoading.set(false); },
      error: e => {
        this.payload.set(null);
        this.payloadError.set(e?.message ?? 'لا توجد بيانات للآية المطلوبة');
        this.payloadLoading.set(false);
      },
    });
  }

  private animateGrid(): void {
    const cards = Array.from(this.grid?.nativeElement.querySelectorAll<HTMLElement>('.source-card') ?? []);
    if (!cards.length) return;
    gsap.fromTo(cards,
      { opacity: 0, y: 22 },
      { opacity: 1, y: 0, duration: 0.38, stagger: 0.05, ease: 'power3.out', delay: 0.08, clearProps: 'transform' });
  }
}
