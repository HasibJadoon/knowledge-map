import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { KMapsService, QuranAyah, AyahsSurah, TranslationPassage } from '../../../../core/services/k-maps.service';

export type ViewMode = 'verse' | 'arabic' | 'translation';

@Component({
  selector: 'km-quran-text',
  standalone: true,
  imports: [RouterLink, NgClass],
  templateUrl: './quran-text.component.html',
  styleUrl: './quran-text.component.scss',
})
export class QuranTextComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly kmaps = inject(KMapsService);

  surahId = signal<number>(1);
  surahInfo = signal<AyahsSurah | null>(null);
  ayahs = signal<QuranAyah[]>([]);
  passages = signal<TranslationPassage[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  viewMode = signal<ViewMode>('arabic');

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('surahId')) || 1;
    this.surahId.set(id);
    this.loadAyahs(id);
  }

  setView(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  retry(): void {
    this.loadAyahs(this.surahId());
  }

  getAyahText(ayah: QuranAyah): string {
    const text = ayah.text_uthmani ?? ayah.text ?? '';
    // Strip trailing verse-end markers (U+06DD ۝) that may already be in the text
    return text.replace(/[\u06DD\u06DE\u06DF]+.*$/, '').trimEnd();
  }

  getWords(ayah: QuranAyah): string[] {
    const src = ayah.text_uthmani ?? ayah.text ?? '';
    return src.split(/\s+/).filter(w => w.length > 0);
  }

  toArabicIndic(n: number): string {
    return n.toString().replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);
  }

  private loadAyahs(surah: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.kmaps.getAyahs(surah).subscribe({
      next: (res) => {
        this.surahInfo.set(res.surah ?? null);
        this.ayahs.set(res.results ?? res.verses ?? []);
        this.passages.set(res.translation_passages ?? []);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err?.message ?? 'Failed to load ayahs');
        this.loading.set(false);
      },
    });
  }

  back(): void {
    this.router.navigate(['/quran']);
  }
}
