import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Input,
  OnChanges, SimpleChanges, computed, inject, signal,
} from '@angular/core';
import gsap from 'gsap';
import {
  QuranSurahService, StudyLessonResponse, WordCardVm,
} from '../../../../../../../shared/services/quran/quran-surah.service';
import { StudyWordModalComponent } from './study-word-modal.component';

interface AyahGroup { ayah: number; words: WordCardVm[]; }

/**
 * Morphology / vocabulary step — the passage word grid.
 * Renders every word from the built morphology API (API 1); clicking a word
 * opens the deep Word Backbone 360 modal (API 2). No UI-side normalization.
 */
@Component({
  selector: 'km-study-vocabulary-step',
  standalone: true,
  imports: [StudyWordModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './study-vocabulary-step.component.html',
  styleUrl: './study-vocabulary-step.component.scss',
})
export class StudyVocabularyStepComponent implements OnChanges, AfterViewInit {
  private readonly svc = inject(QuranSurahService);
  private readonly elRef = inject(ElementRef<HTMLElement>);

  @Input({ required: true }) lesson!: StudyLessonResponse;

  readonly words = signal<WordCardVm[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly filter = signal<'all' | 'noun' | 'verb'>('all');
  readonly selected = signal<WordCardVm | null>(null);

  private loadedKey = '';
  private viewReady = false;

  readonly groups = computed<AyahGroup[]>(() => {
    const f = this.filter();
    const map = new Map<number, WordCardVm[]>();
    for (const w of this.words()) {
      if (f !== 'all' && w.group !== f) continue;
      if (!map.has(w.ayah)) map.set(w.ayah, []);
      map.get(w.ayah)!.push(w);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([ayah, words]) => ({ ayah, words }));
  });

  readonly counts = computed(() => {
    const w = this.words();
    return {
      all: w.length,
      noun: w.filter(x => x.group === 'noun').length,
      verb: w.filter(x => x.group === 'verb').length,
    };
  });

  ngOnChanges(ch: SimpleChanges): void {
    if (ch['lesson'] && this.lesson) this.load();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    queueMicrotask(() => this.animateChips());
  }

  private load(): void {
    const key = `${this.lesson.surahId}:${this.lesson.passageNo}`;
    if (key === this.loadedKey) return;
    this.loadedKey = key;
    this.loading.set(true);
    this.error.set(null);
    this.svc.getPassageMorphology(this.lesson.surahId, this.lesson.passageNo).subscribe({
      next: res => {
        this.words.set(res.words ?? []);
        this.loading.set(false);
        queueMicrotask(() => this.animateChips());
      },
      error: () => {
        this.error.set('تعذّر تحميل تحليل الكلمات لهذا المقطع.');
        this.loading.set(false);
      },
    });
  }

  private animateChips(): void {
    if (!this.viewReady) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const chips = this.elRef.nativeElement.querySelectorAll('.wchip');
    if (chips.length) {
      gsap.fromTo(chips, { opacity: 0, y: 12, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.34, stagger: 0.012, ease: 'power3.out', clearProps: 'transform' });
    }
  }

  setFilter(f: 'all' | 'noun' | 'verb'): void {
    this.filter.set(f);
    queueMicrotask(() => this.animateChips());
  }

  open(w: WordCardVm): void { this.selected.set(w); }
  onClosed(): void { this.selected.set(null); }
  onGraded(_ev: { wordId: string; grade: string }): void { /* P2: write ar_ling_vocab_srs via API */ }

  chipColor(w: WordCardVm): string {
    return w.irab?.term?.color
      || (w.group === 'verb' ? '#d8a35d' : w.group === 'noun' ? '#93b8d6' : '#6b6759');
  }
}
