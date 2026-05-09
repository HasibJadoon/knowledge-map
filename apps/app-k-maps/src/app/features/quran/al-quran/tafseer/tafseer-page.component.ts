import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { QuranResearchApiService, QrScholarWork, QrTafsirEntry } from '../../../../shared/services/quran-research-api.service';
import { QuranResearchSearchService } from '../quran-research-search.service';

interface AyahGroup {
  ayah: number;
  text: string | null;
  entries: QrTafsirEntry[];
}

@Component({
  selector: 'app-tafseer-page',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './tafseer-page.component.html',
  styleUrl: './tafseer-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TafseerPageComponent implements OnInit {
  private readonly api    = inject(QuranResearchApiService);
  private readonly search = inject(QuranResearchSearchService);

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

  readonly currentGroup = computed(() => this.ayahGroups()[this.currentAyahIdx()] ?? null);

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

  deathYear(w: QrScholarWork): string {
    if (w.death_year_hijri) return `ت ${w.death_year_hijri} هـ`;
    if (w.death_year_ce)    return `ت ${w.death_year_ce} م`;
    return '';
  }

  readonly surahs = Array.from({ length: 114 }, (_, i) => i + 1);
}
