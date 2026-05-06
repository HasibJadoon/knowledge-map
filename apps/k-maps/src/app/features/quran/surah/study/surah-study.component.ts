import {
  Component, OnInit, AfterViewInit, ViewChildren,
  QueryList, ElementRef, inject, signal, ChangeDetectionStrategy,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { QuranSurahService, StudyUnitCardVm, StudySurahMeta } from '../../../../shared/services/quran/quran-surah.service';
import { QuranPageShellComponent } from '../../shared/quran-page-shell.component';
import { QuranGsapService } from '../../../../shared/services/quran/quran-gsap.service';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';

@Component({
  selector: 'km-surah-study',
  standalone: true,
  imports: [QuranPageShellComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './surah-study.component.html',
  styleUrl: './surah-study.component.scss',
})
export class SurahStudyComponent implements OnInit, AfterViewInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(QuranSurahService);
  private gsapSvc = inject(QuranGsapService);

  @ViewChildren('cardEl') cardEls!: QueryList<ElementRef>;

  surahId = signal(0);
  surahMeta = signal<StudySurahMeta | null>(null);
  units = signal<StudyUnitCardVm[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  viewMode = signal<'grid' | 'list'>('grid');

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('surahId')) || 0;
    this.surahId.set(id);
    this.svc.getStudyGrid(id).subscribe({
      next: (res) => {
        this.surahMeta.set(res.surah);
        this.units.set(res.units);
        this.loading.set(false);
      },
      error: () => { this.error.set('Failed to load study grid'); this.loading.set(false); },
    });
  }

  ngAfterViewInit(): void {
    this.cardEls.changes.subscribe((list: QueryList<ElementRef>) => {
      const els = list.toArray().map(e => e.nativeElement);
      if (els.length) this.gsapSvc.revealOnScroll(els);
    });
  }

  openUnit(unit: StudyUnitCardVm): void {
    this.router.navigate(['/quran', 'sura', this.surahId(), 'study', unit.order_index]);
  }

  back(): void { this.router.navigate(['/quran']); }

  ayahRange(u: StudyUnitCardVm): string {
    if (!u.ayah_from) return u.start_ref ?? '';
    return u.ayah_to && u.ayah_to !== u.ayah_from
      ? `${this.surahId()}:${u.ayah_from}–${u.ayah_to}`
      : `${this.surahId()}:${u.ayah_from}`;
  }

  hasVocabularyBreakdown(unit: StudyUnitCardVm): boolean {
    return (unit.vocabulary.nouns ?? 0) > 0 || (unit.vocabulary.verbs ?? 0) > 0;
  }

  hasVocabularyTotal(unit: StudyUnitCardVm): boolean {
    return (unit.vocabulary.total ?? 0) > 0;
  }
}
