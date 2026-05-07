import {
  ChangeDetectionStrategy, Component, OnInit, AfterViewInit, OnDestroy,
  ViewChildren, QueryList, ElementRef,
  inject, signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { QuranGsapService } from '../../../../../shared/services/quran/quran-gsap.service';

@Component({
  selector: 'app-surah-vocabulary',
  standalone: true,
  imports: [IonicModule],
  templateUrl: './surah-vocabulary.component.html',
  styleUrl: './surah-vocabulary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurahVocabularyComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly gsap   = inject(QuranGsapService);

  @ViewChildren('lingCard') cardEls!: QueryList<ElementRef>;

  readonly surahId = signal(0);

  private cleanups: Array<() => void> = [];

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('surahId')) || 0;
    this.surahId.set(id);
  }

  ngAfterViewInit(): void {
    const els = this.cardEls.toArray().map(e => e.nativeElement as HTMLElement);
    if (!els.length) return;
    this.gsap.revealCards(els, 0.08);
    for (const el of els) {
      this.cleanups.push(this.gsap.setupIconHover(el));
      this.cleanups.push(this.gsap.setupIconPress(el));
    }
  }

  ngOnDestroy(): void {
    for (const fn of this.cleanups) fn();
  }

  goTo(section: 'near-synonyms' | 'morphology'): void {
    this.router.navigate(['/quran', 'sura', this.surahId(), section]);
  }
}
