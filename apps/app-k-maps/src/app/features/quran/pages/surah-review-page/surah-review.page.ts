import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgClass } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { SurahModulesService, SrsCardVm, ReviewItemVm } from '../../../../shared/services/surah-modules.service';

@Component({
  selector: 'app-surah-review-page',
  standalone: true,
  imports: [IonicModule, NgClass],
  templateUrl: './surah-review.page.html',
  styleUrl: './surah-review.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurahReviewPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly svc = inject(SurahModulesService);

  readonly surahId = signal(0);
  readonly srsItems = signal<SrsCardVm[]>([]);
  readonly progress = signal<ReviewItemVm[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

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

  isDue(item: SrsCardVm): boolean {
    if (!item.due_at) return false;
    return new Date(item.due_at) <= new Date();
  }
}
