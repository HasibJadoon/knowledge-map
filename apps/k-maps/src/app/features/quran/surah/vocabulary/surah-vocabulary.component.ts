import {
  Component, OnInit, AfterViewInit, OnDestroy,
  ViewChildren, QueryList, ElementRef,
  inject, signal, ChangeDetectionStrategy,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { QuranPageShellComponent } from '../../shared/quran-page-shell.component';
import { QuranGsapService } from '../../../../shared/services/quran/quran-gsap.service';

@Component({
  selector: 'km-surah-vocabulary',
  standalone: true,
  imports: [QuranPageShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './surah-vocabulary.component.html',
  styleUrl: './surah-vocabulary.component.scss',
})
export class SurahVocabularyComponent implements OnInit, AfterViewInit, OnDestroy {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private gsap   = inject(QuranGsapService);

  @ViewChildren('lingCard') cardEls!: QueryList<ElementRef>;

  surahId = signal(0);

  private cleanups: Array<() => void> = [];

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('surahId')) || 0;
    this.surahId.set(id);
  }

  ngAfterViewInit(): void {
    const els = this.cardEls.toArray().map(e => e.nativeElement as HTMLElement);
    if (!els.length) return;

    // Staggered reveal on load
    this.gsap.revealCards(els, 0.08);

    // Hover lift + press feedback on each card
    for (const el of els) {
      this.cleanups.push(this.gsap.setupIconHover(el));
      this.cleanups.push(this.gsap.setupIconPress(el));
    }
  }

  ngOnDestroy(): void {
    for (const fn of this.cleanups) fn();
  }

  back(): void { this.router.navigate(['/quran']); }

  goTo(section: 'near-synonyms' | 'morphology'): void {
    this.router.navigate(['/quran', 'sura', this.surahId(), section]);
  }
}
