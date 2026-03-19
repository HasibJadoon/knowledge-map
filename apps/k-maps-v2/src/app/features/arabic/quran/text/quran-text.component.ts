import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { KMapsService, QuranAyah } from '../../../../core/services/k-maps.service';

@Component({
  selector: 'km-quran-text',
  standalone: true,
  imports: [],
  templateUrl: './quran-text.component.html',
  styleUrl: './quran-text.component.scss',
})
export class QuranTextComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly kmaps = inject(KMapsService);

  surahId = signal<number>(1);
  ayahs = signal<QuranAyah[]>([]);
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
        this.ayahs.set(res.results ?? res.verses ?? []);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err?.message ?? 'Failed to load ayahs');
        this.loading.set(false);
      },
    });
  }

  back(): void {
    this.router.navigate(['/arabic/quran']);
  }
}
