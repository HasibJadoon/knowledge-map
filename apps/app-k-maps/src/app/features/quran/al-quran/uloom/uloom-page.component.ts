import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { QuranResearchApiService, QrIrabSource, QrIrabEntry } from '../../../../shared/services/quran-research-api.service';
import { QuranResearchSearchService } from '../quran-research-search.service';

interface AyahGroup {
  ayah: number;
  text: string | null;
  entries: QrIrabEntry[];
}

@Component({
  selector: 'app-uloom-page',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './uloom-page.component.html',
  styleUrl: './uloom-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UloomPageComponent implements OnInit {
  private readonly api    = inject(QuranResearchApiService);
  private readonly search = inject(QuranResearchSearchService);

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

  readonly currentGroup = computed(() => this.ayahGroups()[this.currentAyahIdx()] ?? null);

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

  readonly surahs = Array.from({ length: 114 }, (_, i) => i + 1);
}
