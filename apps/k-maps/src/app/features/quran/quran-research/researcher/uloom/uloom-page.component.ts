import {
  Component, OnInit, inject, signal, computed,
  ElementRef, ViewChild, AfterViewInit, effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import gsap from 'gsap';
import { QuranResearchApiService } from '../../../../../shared/services/quran/quran-research-api.service';
import type { QrIrabSource, QrIrabEntry } from '../../../../../shared/models/quran/qr.models';

interface AyahGroup {
  ayah: number;
  text: string | null;
  entries: QrIrabEntry[];
}

@Component({
  selector: 'km-uloom-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './uloom-page.component.html',
  styleUrl: './uloom-page.component.scss',
})
export class UloomPageComponent implements OnInit, AfterViewInit {
  @ViewChild('grid') grid?: ElementRef<HTMLElement>;

  private readonly api = inject(QuranResearchApiService);

  readonly sources        = signal<QrIrabSource[]>([]);
  readonly loading        = signal(true);
  readonly searchTerm     = signal('');
  readonly selectedSource = signal<QrIrabSource | null>(null);
  readonly selectedSurah  = signal<number>(1);
  readonly entries        = signal<QrIrabEntry[]>([]);
  readonly entriesLoading = signal(false);
  readonly currentAyahIdx = signal(0);

  readonly filteredSources = computed(() => {
    const q = this.searchTerm().toLowerCase().trim();
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
      this.currentAyahIdx.set(0);
      this.loadEntries(src.source_slug, surah);
    });
  }

  ngOnInit(): void {
    this.api.getIrabSources().subscribe({
      next: res => { this.sources.set(res.sources); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  ngAfterViewInit(): void {
    this.animateGrid();
  }

  setSearch(value: string): void { this.searchTerm.set(value); }

  selectSource(src: QrIrabSource): void {
    this.selectedSource.set(src);
    this.entries.set([]);
    this.currentAyahIdx.set(0);
  }

  closeSource(): void {
    this.selectedSource.set(null);
    this.entries.set([]);
    this.currentAyahIdx.set(0);
  }

  setSurah(surah: number): void { this.selectedSurah.set(surah); this.currentAyahIdx.set(0); }
  prevAyah(): void { if (this.currentAyahIdx() > 0) this.currentAyahIdx.update(i => i - 1); }
  nextAyah(): void { if (this.currentAyahIdx() < this.ayahGroups().length - 1) this.currentAyahIdx.update(i => i + 1); }

  private loadEntries(slug: string, surah: number): void {
    this.entriesLoading.set(true);
    this.api.getIrabEntries(surah, undefined, slug, 1, 500).subscribe({
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
