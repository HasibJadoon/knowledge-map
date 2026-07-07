import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Input,
  OnChanges, SimpleChanges, computed, inject, signal,
} from '@angular/core';
import { Router } from '@angular/router';
import gsap from 'gsap';
import {
  QuranSurahService, StudyLessonResponse, MorphGridCard,
} from '../../../../../../../shared/services/quran/quran-surah.service';

interface AyahGroup { ayah: number; words: MorphGridCard[]; }

/**
 * Morphology step — the curated WORD-CARD grid. Shows only PROMOTED content
 * words (major nouns/verbs, no ḥarf/common words), each a rich card with the
 * word, its meaning summary, root, and basic morphology. Clicking a card opens
 * the full-page word reader. All data from the display layer; no UI logic.
 */
@Component({
  selector: 'km-study-vocabulary-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './study-vocabulary-step.component.html',
  styleUrl: './study-vocabulary-step.component.scss',
})
export class StudyVocabularyStepComponent implements OnChanges, AfterViewInit {
  private readonly svc = inject(QuranSurahService);
  private readonly router = inject(Router);
  private readonly elRef = inject(ElementRef<HTMLElement>);

  @Input({ required: true }) lesson!: StudyLessonResponse;

  readonly words = signal<MorphGridCard[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly filter = signal<'all' | 'noun' | 'verb'>('all');

  private loadedKey = '';
  private viewReady = false;

  readonly groups = computed<AyahGroup[]>(() => {
    const f = this.filter();
    const map = new Map<number, MorphGridCard[]>();
    for (const w of this.words()) {
      if (f !== 'all' && w.group !== f) continue;
      if (!map.has(w.ayah)) map.set(w.ayah, []);
      map.get(w.ayah)!.push(w);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([ayah, words]) => ({ ayah, words }));
  });

  readonly counts = computed(() => {
    const w = this.words();
    return { all: w.length, noun: w.filter(x => x.group === 'noun').length, verb: w.filter(x => x.group === 'verb').length };
  });

  ngOnChanges(ch: SimpleChanges): void { if (ch['lesson'] && this.lesson) this.load(); }
  ngAfterViewInit(): void { this.viewReady = true; queueMicrotask(() => this.animateCards()); }

  private load(): void {
    const key = `${this.lesson.surahId}`;
    if (key === this.loadedKey) return;
    this.loadedKey = key;
    this.loading.set(true); this.error.set(null);
    this.svc.getMorphGrid(this.lesson.surahId).subscribe({
      next: res => { this.words.set(res ?? []); this.loading.set(false); queueMicrotask(() => this.animateCards()); },
      error: () => { this.error.set('تعذّر تحميل كلمات هذا المقطع.'); this.loading.set(false); },
    });
  }

  private animateCards(): void {
    if (!this.viewReady || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const cards = this.elRef.nativeElement.querySelectorAll('.wcard');
    if (cards.length) {
      gsap.fromTo(cards, { opacity: 0, y: 14, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.34, stagger: 0.02, ease: 'power3.out', clearProps: 'transform' });
    }
  }

  setFilter(f: 'all' | 'noun' | 'verb'): void { this.filter.set(f); queueMicrotask(() => this.animateCards()); }

  open(w: MorphGridCard): void {
    this.router.navigate(['/quran/surahs', this.lesson.surahId, 'study', this.lesson.passageNo, 'word', w.ayah, w.word_index]);
  }
}
