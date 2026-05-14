import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { QuranResearchApiService, QrScholarWork, QrTafsirEntry } from '../../../../shared/services/quran-research-api.service';
import { BackendApiService } from '../../../../shared/services/backend-api.service';
import { QuranResearchSearchService } from '../quran-research-search.service';
import { QrefPillComponent } from '../../../../shared/components/qref-pill/qref-pill.component';
import { VerseDisplayComponent } from '../../../../shared/components/verse-display/verse-display.component';
import { bodySegments, ProseSegment } from '../../../../shared/utils/body-segments.util';

interface AyahGroup {
  ayah: number;
  text: string | null;
  entries: QrTafsirEntry[];
}

interface AyahPreview {
  surah: number; ayah: number;
  text_display: string;
  translation: string | null;
  verse_mark: string | null;
  page_number: number | null;
}

@Component({
  selector: 'app-tafseer-page',
  standalone: true,
  imports: [CommonModule, IonicModule, QrefPillComponent, VerseDisplayComponent],
  templateUrl: './tafseer-page.component.html',
  styleUrl: './tafseer-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TafseerPageComponent implements OnInit {
  private readonly api        = inject(QuranResearchApiService);
  private readonly backend    = inject(BackendApiService);
  private readonly search     = inject(QuranResearchSearchService);
  private readonly router     = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly works          = signal<QrScholarWork[]>([]);
  readonly loading        = signal(true);
  readonly selectedWork   = signal<QrScholarWork | null>(null);
  readonly selectedSurah  = signal(1);
  readonly entries        = signal<QrTafsirEntry[]>([]);
  readonly entriesLoading = signal(false);
  readonly currentAyahIdx = signal(0);

  readonly filteredWorks = computed(() => {
    const q = this.search.searchTerm().trim().toLowerCase();
    if (!q) return this.works();
    return this.works().filter(w =>
      `${w.title_ar} ${w.title_en ?? ''} ${w.scholar_name_ar} ${w.scholar_name_en ?? ''}`.toLowerCase().includes(q)
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

  readonly madhabLabel: Record<string, string> = {
    sunni: 'سني', maliki: 'مالكي', shafii: 'شافعي',
    hanbali: 'حنبلي', hanafi: 'حنفي', mutazili: 'معتزلي', ashari: 'أشعري',
  };

  constructor() {
    effect(() => {
      const work  = this.selectedWork();
      const surah = this.selectedSurah();
      if (!work) return;
      this.entriesLoading.set(true);
      this.currentAyahIdx.set(0);
      this.api.getTafsirEntries(surah, work.id).subscribe({
        next: res => { this.entries.set(res.rows); this.entriesLoading.set(false); },
        error: () => this.entriesLoading.set(false),
      });
    });
  }

  ngOnInit(): void {
    this.api.getWorks('tafsir').subscribe({
      next: res => { this.works.set(res.works); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  selectWork(w: QrScholarWork): void { this.selectedWork.set(w); this.entries.set([]); this.currentAyahIdx.set(0); }
  closeWork(): void { this.selectedWork.set(null); this.entries.set([]); this.currentAyahIdx.set(0); }
  setSurah(s: number): void { this.selectedSurah.set(s); this.currentAyahIdx.set(0); }
  prevAyah(): void { if (this.currentAyahIdx() > 0) this.currentAyahIdx.update(i => i - 1); }
  nextAyah(): void { if (this.currentAyahIdx() < this.ayahGroups().length - 1) this.currentAyahIdx.update(i => i + 1); }
  goToAyahNum(ayah: number): void { const i = this.ayahGroups().findIndex(g => g.ayah === ayah); if (i >= 0) this.currentAyahIdx.set(i); }

  deathYear(w: QrScholarWork): string {
    if (w.death_year_hijri) return `ت ${w.death_year_hijri} هـ`;
    if (w.death_year_ce)    return `ت ${w.death_year_ce} م`;
    return '';
  }

  readonly surahs = Array.from({ length: 114 }, (_, i) => i + 1);

  // ── Skeleton placeholders (used by template *ngFor on loading)
  readonly skeletonRows = Array.from({ length: 3 });

  // ── Inline ref parsing: bodySegments without footnote awareness (tafsir
  //    sources don't expose a structured footnote list).
  segments(text: string | null | undefined): ProseSegment[] {
    return bodySegments(text);
  }

  // ── Ayah preview modal — mirrors the lexicon reader pattern so users
  //    get the same affordance everywhere they tap a Quran reference.
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
