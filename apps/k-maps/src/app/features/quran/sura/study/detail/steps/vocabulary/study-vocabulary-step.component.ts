import {
  ChangeDetectionStrategy, Component, Input,
  OnChanges, SimpleChanges, computed, inject, signal,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  QuranSurahService, StudyLessonResponse, MorphGridCard,
} from '../../../../../../../shared/services/quran/quran-surah.service';
import { MorphWordCardComponent, MorphCardVm } from '../../../../../shared/morph-word-card.component';

interface AyahGroup { ayah: number; words: MorphGridCard[]; }

/**
 * Morphology step — the curated WORD-CARD grid. Shows only PROMOTED content
 * words (major nouns/verbs, no ḥarf/common words). Renders the shared
 * <km-morph-word-card> so the passage step and the full-surah morphology page
 * paint the identical card (design + 3D). Clicking a card opens the full-page
 * word reader. All data from the display layer; no UI logic.
 */
@Component({
  selector: 'km-study-vocabulary-step',
  standalone: true,
  imports: [MorphWordCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './study-vocabulary-step.component.html',
  styleUrl: './study-vocabulary-step.component.scss',
})
export class StudyVocabularyStepComponent implements OnChanges {
  private readonly svc = inject(QuranSurahService);
  private readonly router = inject(Router);

  @Input({ required: true }) lesson!: StudyLessonResponse;

  readonly words = signal<MorphGridCard[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly filter = signal<'all' | 'noun' | 'verb'>('all');

  private loadedKey = '';

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

  private load(): void {
    const key = `${this.lesson.surahId}`;
    if (key === this.loadedKey) return;
    this.loadedKey = key;
    this.loading.set(true); this.error.set(null);
    this.svc.getMorphGrid(this.lesson.surahId).subscribe({
      next: res => { this.words.set(res ?? []); this.loading.set(false); },
      error: () => { this.error.set('تعذّر تحميل كلمات هذا المقطع.'); this.loading.set(false); },
    });
  }

  setFilter(f: 'all' | 'noun' | 'verb'): void { this.filter.set(f); }

  /** Map a curated grid card onto the shared card view-model. */
  toVm(w: MorphGridCard): MorphCardVm {
    return {
      group: w.group,
      posLabel: w.pos_en || (w.group === 'verb' ? 'Verb' : 'Noun'),
      ref: `${w.surah}:${w.ayah}`,
      isAnchor: w.is_anchor,
      feats: w.feats ?? [],
      surfaceAr: w.surface_ar,
      arc: w.sense_arc_en,
      rangeText: w.sense_range_en || w.gloss.en,
      // verbs carry their pattern as the form/family chip → no redundant header wazn
      waznAr: w.group === 'verb' ? null : w.wazn_ar,
      rootDisplay: w.root_display,
      rootAr: w.root_ar,
    };
  }

  open(w: MorphGridCard): void {
    this.router.navigate(['/quran/surahs', this.lesson.surahId, 'study', this.lesson.passageNo, 'word', w.ayah, w.word_index]);
  }

  openRoot(root: string | null): void {
    const r = (root ?? '').replace(/\s+/g, '').trim();
    if (r) this.router.navigate(['/quran/lexicon'], { queryParams: { root: r } });
  }
}
