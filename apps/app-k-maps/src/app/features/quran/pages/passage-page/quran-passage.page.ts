import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import {
  QuranReaderService,
  AyahsSurah,
  TranslationPassage,
} from '../../../../shared/services/quran-reader.service';

@Component({
  selector: 'app-quran-passage-page',
  standalone: true,
  imports: [IonicModule],
  templateUrl: './quran-passage.page.html',
  styleUrl: './quran-passage.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuranPassagePage implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly quranReader = inject(QuranReaderService);

  readonly surahId = signal<number>(1);
  readonly passageIndex = signal<number>(1);
  readonly surahInfo = signal<AyahsSurah | null>(null);
  readonly passage = signal<TranslationPassage | null>(null);
  readonly allPassages = signal<TranslationPassage[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

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

  get isLastPassage(): boolean {
    const all = this.allPassages();
    return all.length > 0 && this.passageIndex() >= all[all.length - 1]!.passage_index;
  }

  private load(surah: number, idx: number): void {
    this.loading.set(true);
    this.error.set(null);
    // Load all passages for this surah to find the target and enable navigation
    this.quranReader.getSurahAyahs(surah).subscribe({
      next: (res) => {
        this.surahInfo.set(res.surah ?? null);
        const passages = res.translation_passages ?? [];
        this.allPassages.set(passages);
        this.passage.set(passages.find(p => p.passage_index === idx) ?? null);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err?.message ?? 'Failed to load passage');
        this.loading.set(false);
      },
    });
  }
}
