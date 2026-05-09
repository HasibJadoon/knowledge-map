import {
  Component, OnInit, inject, signal, computed,
  ElementRef, ViewChild, AfterViewInit, effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import gsap from 'gsap';
import { QuranResearchApiService } from '../../../../../shared/services/quran/quran-research-api.service';
import type { QrScholarWork, QrTafsirEntry } from '../../../../../shared/models/quran/qr.models';

interface AyahGroup {
  ayah: number;
  text: string | null;
  entries: QrTafsirEntry[];
}

@Component({
  selector: 'km-tafseer-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tafseer-page.component.html',
  styleUrl: './tafseer-page.component.scss',
})
export class TafseerPageComponent implements OnInit, AfterViewInit {
  @ViewChild('grid') grid?: ElementRef<HTMLElement>;

  private readonly api = inject(QuranResearchApiService);

  readonly works          = signal<QrScholarWork[]>([]);
  readonly loading        = signal(true);
  readonly searchTerm     = signal('');
  readonly selectedWork   = signal<QrScholarWork | null>(null);
  readonly selectedSurah  = signal<number>(1);
  readonly entries        = signal<QrTafsirEntry[]>([]);
  readonly entriesLoading = signal(false);
  readonly currentAyahIdx = signal(0);

  readonly filteredWorks = computed(() => {
    const q = this.searchTerm().toLowerCase().trim();
    if (!q) return this.works();
    return this.works().filter(w =>
      `${w.title_ar} ${w.title_en ?? ''} ${w.scholar_name_ar} ${w.scholar_name_en ?? ''} ${w.era ?? ''} ${w.madhab ?? ''}`.toLowerCase().includes(q)
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

  readonly eraLabel: Record<string, string> = {
    classical: 'كلاسيكي',
    modern: 'حديث',
  };

  readonly madhabLabel: Record<string, string> = {
    sunni: 'سني',
    maliki: 'مالكي',
    shafii: 'شافعي',
    hanbali: 'حنبلي',
    hanafi: 'حنفي',
    mutazili: 'معتزلي',
    ashari: 'أشعري',
  };

  constructor() {
    effect(() => {
      const work  = this.selectedWork();
      const surah = this.selectedSurah();
      if (!work) return;
      this.currentAyahIdx.set(0);
      this.loadEntries(work.id, surah);
    });
  }

  ngOnInit(): void {
    this.api.getWorks('tafsir').subscribe({
      next: res => { this.works.set(res.works); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  ngAfterViewInit(): void {
    this.animateGrid();
  }

  setSearch(value: string): void { this.searchTerm.set(value); }

  selectWork(work: QrScholarWork): void {
    this.selectedWork.set(work);
    this.entries.set([]);
    this.currentAyahIdx.set(0);
  }

  closeWork(): void {
    this.selectedWork.set(null);
    this.entries.set([]);
    this.currentAyahIdx.set(0);
  }

  setSurah(surah: number): void { this.selectedSurah.set(surah); this.currentAyahIdx.set(0); }
  prevAyah(): void { if (this.currentAyahIdx() > 0) this.currentAyahIdx.update(i => i - 1); }
  nextAyah(): void { if (this.currentAyahIdx() < this.ayahGroups().length - 1) this.currentAyahIdx.update(i => i + 1); }

  eraOf(w: QrScholarWork): string { return this.eraLabel[w.era ?? ''] ?? (w.era ?? '—'); }
  madhabOf(w: QrScholarWork): string { return this.madhabLabel[w.madhab ?? ''] ?? (w.madhab ?? '—'); }

  deathYear(w: QrScholarWork): string {
    if (w.death_year_hijri) return `ت ${w.death_year_hijri} هـ`;
    if (w.death_year_ce)    return `ت ${w.death_year_ce} م`;
    return '';
  }

  private loadEntries(workId: string, surah: number): void {
    this.entriesLoading.set(true);
    this.api.getTafsirEntries(surah, undefined, workId, 1, 300).subscribe({
      next: res => { this.entries.set(res.rows); this.entriesLoading.set(false); },
      error: () => this.entriesLoading.set(false),
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

  readonly surahs = Array.from({ length: 114 }, (_, i) => i + 1);
}
