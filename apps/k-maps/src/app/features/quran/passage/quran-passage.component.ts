import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AyahsSurah, TranslationPassage } from '../../../shared/models/quran/quran.models';
import { mapQrPassagesToResponse } from '../../../shared/services/quran/quran-api.mapper';
import { QuranApiService } from '../../../shared/services/quran/quran-api.service';

@Component({
  selector: 'km-quran-passage',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './quran-passage.component.html',
  styleUrl: './quran-passage.component.scss',
})
export class QuranPassageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly qrApi = inject(QuranApiService);

  surahId = signal<number>(1);
  passageIndex = signal<number>(1);
  surahInfo = signal<AyahsSurah | null>(null);
  passage = signal<TranslationPassage | null>(null);
  allPassages = signal<TranslationPassage[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const surah = Number(this.route.snapshot.paramMap.get('surahId')) || 1;
    const idx = Number(this.route.snapshot.paramMap.get('passageIndex')) || 1;
    this.surahId.set(surah);
    this.passageIndex.set(idx);
    this.load(surah, idx);
  }

  retry(): void {
    this.load(this.surahId(), this.passageIndex());
  }

  private load(surah: number, idx: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.qrApi.getSurahPassages(surah).subscribe({
      next: (qrRes) => {
        const res = mapQrPassagesToResponse(qrRes.data, idx);
        this.surahInfo.set(res.surah ?? null);
        this.passage.set(res.passage ?? (res.passages[0] ?? null));
        this.loading.set(false);
        // Also load all passages for navigation
        this.allPassages.set(res.passages);
      },
      error: (err: Error) => {
        this.error.set(err?.message ?? 'Failed to load passage');
        this.loading.set(false);
      },
    });
  }

  prevPassage(): void {
    const idx = this.passageIndex() - 1;
    if (idx >= 1) {
      this.router.navigate(['/quran', this.surahId(), 'passage', idx]);
    }
  }

  nextPassage(): void {
    const all = this.allPassages();
    const idx = this.passageIndex() + 1;
    if (!all.length || idx <= all[all.length - 1]!.passage_index) {
      this.router.navigate(['/quran', this.surahId(), 'passage', idx]);
    }
  }

  backToSurah(): void {
    this.router.navigate(['/quran', this.surahId()]);
  }
}
