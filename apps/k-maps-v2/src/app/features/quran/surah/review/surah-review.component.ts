import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { NgClass } from '@angular/common';
import { SurahModulesService, SrsCardVm, ReviewItemVm } from '../../../../shared/services/surah-modules.service';
import { QuranPageShellComponent } from '../../shared/quran-page-shell.component';

@Component({
  selector: 'km-surah-review',
  standalone: true,
  imports: [NgClass, QuranPageShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './surah-review.component.html',
  styleUrl: './surah-review.component.scss',
})
export class SurahReviewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(SurahModulesService);

  surahId = signal(0);
  srsItems = signal<SrsCardVm[]>([]);
  progress = signal<ReviewItemVm[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('surahId')) || 0;
    this.surahId.set(id);
    this.svc.getSurahReview(id).subscribe({
      next: (res) => {
        this.srsItems.set(res.srsItems ?? []);
        this.progress.set(res.lessonProgress ?? []);
        this.loading.set(false);
      },
      error: (e) => { this.error.set(e?.message ?? 'Failed'); this.loading.set(false); },
    });
  }

  back(): void { this.router.navigate(['/quran']); }

  isDue(item: SrsCardVm): boolean {
    if (!item.due_at) return false;
    return new Date(item.due_at) <= new Date();
  }
}
