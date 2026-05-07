import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Input, OnDestroy, effect, inject, signal } from '@angular/core';
import gsap from 'gsap';
import { StudyLessonResponse, StudyWordVm, UnitTaskVm } from '../../../../../../../../shared/services/quran/quran-surah.service';

type JsonRecord = Record<string, unknown>;

@Component({
  selector: 'km-study-vocabulary-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './study-vocabulary-step.component.html',
  styleUrl: './study-vocabulary-step.component.scss',
})
export class StudyVocabularyStepComponent {
  private readonly elRef = inject(ElementRef<HTMLElement>);
  private viewReady = false;
  private hoverCleanup: Array<() => void> = [];

  @Input({ required: true }) lesson!: StudyLessonResponse;
  showNouns = signal(true);

  constructor() {
    effect(() => {
      this.showNouns();
      if (!this.viewReady) return;
      queueMicrotask(() => this.animateCards());
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    queueMicrotask(() => this.animateCards());
  }

  ngOnDestroy(): void {
    this.clearHoverHandlers();
  }

  nouns(): StudyWordVm[] {
    if (this.lesson.vocabulary.nouns.length > 0) return this.lesson.vocabulary.nouns;
    return this.fallbackMorphology().nouns;
  }

  verbs(): StudyWordVm[] {
    if (this.lesson.vocabulary.verbs.length > 0) return this.lesson.vocabulary.verbs;
    return this.fallbackMorphology().verbs;
  }

  hasVocabularySplit(): boolean {
    return this.nouns().length > 0 || this.verbs().length > 0;
  }

  splitPending(): boolean {
    return !this.hasVocabularySplit() && !!this.lesson.unit?.text_cache?.trim();
  }

  private fallbackMorphology(): { nouns: StudyWordVm[]; verbs: StudyWordVm[] } {
    const morphologyTask = this.lesson.tasks.find((task) => task.task_type === 'morphology');
    if (!morphologyTask) return { nouns: [], verbs: [] };

    const payloads = [
      this.parseJsonLike(morphologyTask.task_json),
      ...((morphologyTask.children ?? []).map((child) => this.parseJsonLike(child.task_json))),
    ];

    const items = payloads.flatMap((payload) => this.extractItems(payload));
    const nouns = items
      .filter((item) => this.normalizePos(item['pos']) === 'noun')
      .map((item) => this.toWord(item, 'noun'));
    const verbs = items
      .filter((item) => this.normalizePos(item['pos']) === 'verb')
      .map((item) => this.toWord(item, 'verb'));

    return { nouns, verbs };
  }

  private extractItems(raw: unknown): JsonRecord[] {
    const payload = this.asRecord(raw);
    if (!payload) return [];

    const items = this.asRecordArray(payload['items']);
    if (items.length > 0) return items;

    const lexiconMorphology = this.asRecordArray(payload['lexicon_morphology']);
    return lexiconMorphology;
  }

  private toWord(raw: JsonRecord, pos: 'noun' | 'verb'): StudyWordVm {
    const translation = this.asRecord(raw['translation']);
    const morphology = this.asRecord(raw['morphology']);
    const morphFeatures = this.asRecord(raw['morph_features']);
    const morphologyFeatures = this.asRecord(morphology?.['morph_features']);
    const surfaceAnalysis = this.asRecord(morphFeatures?.['surface_analysis']) ?? this.asRecord(morphologyFeatures?.['surface_analysis']);

    return {
      word_id: this.asString(raw['ar_token_occ_id'])
        ?? this.asString(raw['word_location'])
        ?? `${this.asNumber(raw['ayah']) ?? 0}:${this.asNumber(raw['token_index']) ?? 0}:${pos}`,
      ayah: this.asNumber(raw['ayah']) ?? 0,
      position: this.asNumber(raw['token_index']) ?? 0,
      word: this.asString(raw['surface_ar']) ?? this.asString(raw['lemma_ar']) ?? '',
      simple: this.asString(raw['surface_norm']) ?? undefined,
      translation: this.asString(translation?.['primary']) ?? undefined,
      lemma: this.asString(raw['lemma_ar']) ?? undefined,
      root: this.asString(raw['root_norm']) ?? undefined,
      gloss: this.asString(translation?.['primary']) ?? this.firstString(raw['meanings']) ?? undefined,
      meanings: this.firstString(raw['meanings']) ?? undefined,
      verb_form: this.asString(morphFeatures?.['form_number']) ?? this.asString(morphologyFeatures?.['form_number']) ?? undefined,
      pattern: this.asString(raw['morph_pattern']) ?? undefined,
      transitivity: this.asString(morphFeatures?.['transitivity']) ?? this.asString(morphologyFeatures?.['transitivity']) ?? undefined,
      morphology: {
        verb_form: this.asString(morphFeatures?.['form_number']) ?? this.asString(morphologyFeatures?.['form_number']) ?? undefined,
        derived_pattern: this.asString(raw['morph_pattern']) ?? undefined,
        noun_number: this.asString(surfaceAnalysis?.['number']) ?? this.asString(morphFeatures?.['number_base']) ?? this.asString(morphologyFeatures?.['number_base']) ?? undefined,
        transitivity: this.asString(morphFeatures?.['transitivity']) ?? this.asString(morphologyFeatures?.['transitivity']) ?? undefined,
      },
    };
  }

  private parseJsonLike(raw: unknown): unknown {
    if (typeof raw !== 'string') return raw;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private asRecord(value: unknown): JsonRecord | null {
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : null;
  }

  private asRecordArray(value: unknown): JsonRecord[] {
    return Array.isArray(value)
      ? value.filter((entry): entry is JsonRecord => !!entry && typeof entry === 'object' && !Array.isArray(entry))
      : [];
  }

  private asString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private asNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  private firstString(value: unknown): string | null {
    if (!Array.isArray(value)) return null;
    const first = value.find((entry) => typeof entry === 'string' && entry.trim());
    return typeof first === 'string' ? first.trim() : null;
  }

  private normalizePos(value: unknown): 'noun' | 'verb' | null {
    const pos = this.asString(value)?.toLowerCase();
    if (pos === 'noun' || pos === 'verb') return pos;
    return null;
  }

  private animateCards(): void {
    const host = this.elRef.nativeElement;
    const cards = Array.from(host.querySelectorAll('.word-card')).filter(
      (card): card is HTMLElement => card instanceof HTMLElement,
    );
    const toggleNode = host.querySelector('.vocab-toggle');
    const toggle = toggleNode instanceof HTMLElement ? toggleNode : null;

    this.clearHoverHandlers();
    gsap.killTweensOf(cards);
    if (toggle) {
      gsap.killTweensOf(toggle);
      gsap.fromTo(toggle, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.28, ease: 'power2.out' });
    }
    if (!cards.length) return;

    gsap.set(cards, { opacity: 0, y: 18, scale: 0.985, rotateX: -6, transformOrigin: '50% 100%' });
    gsap.to(cards, {
      opacity: 1,
      y: 0,
      scale: 1,
      rotateX: 0,
      duration: 0.42,
      ease: 'power3.out',
      stagger: 0.05,
      clearProps: 'transform',
    });

    cards.forEach((card) => {
      const enter = () => {
        gsap.to(card, {
          y: -6,
          scale: 1.015,
          boxShadow: '0 18px 38px rgba(0, 0, 0, 0.28)',
          borderColor: card.classList.contains('word-card--verb')
            ? 'rgba(77, 217, 168, 0.38)'
            : 'rgba(201, 168, 76, 0.34)',
          duration: 0.22,
          ease: 'power2.out',
        });
      };
      const leave = () => {
        gsap.to(card, {
          y: 0,
          scale: 1,
          boxShadow: '0 0 0 rgba(0, 0, 0, 0)',
          borderColor: 'var(--km-border)',
          duration: 0.24,
          ease: 'power2.out',
        });
      };

      card.addEventListener('pointerenter', enter);
      card.addEventListener('pointerleave', leave);
      this.hoverCleanup.push(() => {
        card.removeEventListener('pointerenter', enter);
        card.removeEventListener('pointerleave', leave);
      });
    });
  }

  private clearHoverHandlers(): void {
    this.hoverCleanup.forEach((dispose) => dispose());
    this.hoverCleanup = [];
  }
}
