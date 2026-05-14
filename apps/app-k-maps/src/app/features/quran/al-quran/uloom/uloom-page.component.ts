import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { QuranResearchApiService, QrIrabSource, QrIrabEntry } from '../../../../shared/services/quran-research-api.service';
import { BackendApiService } from '../../../../shared/services/backend-api.service';
import { QuranResearchSearchService } from '../quran-research-search.service';
import { QrefPillComponent } from '../../../../shared/components/qref-pill/qref-pill.component';
import { VerseDisplayComponent } from '../../../../shared/components/verse-display/verse-display.component';
import { bodySegments, ProseSegment } from '../../../../shared/utils/body-segments.util';

interface AyahGroup {
  ayah: number;
  text: string | null;
  entries: QrIrabEntry[];
}

interface AyahPreview {
  surah: number; ayah: number;
  text_display: string;
  translation: string | null;
  verse_mark: string | null;
  page_number: number | null;
}

@Component({
  selector: 'app-uloom-page',
  standalone: true,
  imports: [CommonModule, IonicModule, QrefPillComponent, VerseDisplayComponent],
  templateUrl: './uloom-page.component.html',
  styleUrl: './uloom-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UloomPageComponent implements OnInit {
  private readonly api        = inject(QuranResearchApiService);
  private readonly backend    = inject(BackendApiService);
  private readonly search     = inject(QuranResearchSearchService);
  private readonly router     = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly sources        = signal<QrIrabSource[]>([]);
  readonly loading        = signal(true);
  readonly selectedSource = signal<QrIrabSource | null>(null);
  readonly selectedSurah  = signal(1);
  readonly entries        = signal<QrIrabEntry[]>([]);
  readonly entriesLoading = signal(false);
  readonly currentAyahIdx = signal(0);

  readonly filteredSources = computed(() => {
    const q = this.search.searchTerm().trim().toLowerCase();
    if (!q) return this.sources();
    return this.sources().filter(s =>
      `${s.source_title_ar} ${s.source_title_en ?? ''}`.toLowerCase().includes(q)
    );
  });

  readonly ayahGroups = computed<AyahGroup[]>(() => {
    const map = new Map<number, AyahGroup>();
    for (const e of this.entries()) {
      const n = e.ayah_from;
      if (!map.has(n)) map.set(n, { ayah: n, text: e.ayah_text ?? null, entries: [] });
      map.get(n)!.entries.push(e);
    }
    return [...map.values()].sort((a, b) => a.ayah - b.ayah);
  });

  readonly currentGroup = computed<AyahGroup | null>(() => this.ayahGroups()[this.currentAyahIdx()] ?? null);

  constructor() {
    effect(() => {
      const src   = this.selectedSource();
      const surah = this.selectedSurah();
      if (!src) return;
      this.entriesLoading.set(true);
      this.currentAyahIdx.set(0);
      this.api.getIrabEntries(surah, src.source_slug).subscribe({
        next: res => { this.entries.set(res.rows); this.entriesLoading.set(false); },
        error: () => this.entriesLoading.set(false),
      });
    });
  }

  ngOnInit(): void {
    this.api.getIrabSources().subscribe({
      next: res => { this.sources.set(res.sources); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  selectSource(s: QrIrabSource): void { this.selectedSource.set(s); this.entries.set([]); this.currentAyahIdx.set(0); }
  closeSource(): void { this.selectedSource.set(null); this.entries.set([]); this.currentAyahIdx.set(0); }
  setSurah(s: number): void { this.selectedSurah.set(s); this.currentAyahIdx.set(0); }
  prevAyah(): void { if (this.currentAyahIdx() > 0) this.currentAyahIdx.update(i => i - 1); }
  nextAyah(): void { if (this.currentAyahIdx() < this.ayahGroups().length - 1) this.currentAyahIdx.update(i => i + 1); }
  goToAyahNum(ayah: number): void { const i = this.ayahGroups().findIndex(g => g.ayah === ayah); if (i >= 0) this.currentAyahIdx.set(i); }

  readonly surahs = Array.from({ length: 114 }, (_, i) => i + 1);
  readonly skeletonRows = Array.from({ length: 3 });

  segments(text: string | null | undefined): ProseSegment[] {
    return bodySegments(text);
  }

  // ── Ayah preview modal (shared pattern with Tafseer/Lexicon)
  readonly ayahModalOpen    = signal(false);
  readonly ayahModalLoading = signal(false);
  readonly ayahPreview      = signal<AyahPreview | null>(null);

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
