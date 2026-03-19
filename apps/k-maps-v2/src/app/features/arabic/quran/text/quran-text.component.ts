import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { KMapsService, QuranAyah, AyahsSurah, TranslationPassage } from '../../../../core/services/k-maps.service';

@Component({
  selector: 'km-quran-text',
  standalone: true,
  imports: [RouterLink],
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

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('surahId')) || 1;
    this.surahId.set(id);
    this.loadAyahs(id);
  }

  retry(): void {
    this.loadAyahs(this.surahId());
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
