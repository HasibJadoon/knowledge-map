import { Component, OnInit, AfterViewInit, ViewChildren, QueryList, ElementRef, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { NgClass } from '@angular/common';
import { SurahModulesApiService, SrsCardVm, ReviewItemVm } from '../../../../shared/services/quran/surah-modules-api.service';
import { QuranPageShellComponent } from '../../shared/quran-page-shell.component';
import { QuranGsapService } from '../../../../shared/services/quran/quran-gsap.service';

@Component({
  selector: 'km-surah-review',
  standalone: true,
  imports: [NgClass, QuranPageShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './surah-review.component.html',
  styleUrl: './surah-review.component.scss',
})
export class SurahReviewComponent implements OnInit, AfterViewInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(SurahModulesApiService);
  private gsapSvc = inject(QuranGsapService);

  @ViewChildren('reviewEl') reviewEls!: QueryList<ElementRef>;

  surahId = signal(0);
  srsItems = signal<SrsCardVm[]>([]);
  progress = signal<ReviewItemVm[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  ngAfterViewInit(): void {
    this.reviewEls.changes.subscribe((list: QueryList<ElementRef>) => {
      const els = list.toArray().map(e => e.nativeElement);
      if (els.length) this.gsapSvc.revealOnScroll(els);
    });
  }

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
