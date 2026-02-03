import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

import { QuranLessonService } from '../../../../../shared/services/quran-lesson.service';
import {
  QuranLesson,
  QuranLessonMcq,
  QuranLessonComprehensionQuestion,
  QuranLessonUnit,
} from '../../../../../shared/models/arabic/quran-lesson.model';

type StudyTab = 'study' | 'sentences' | 'mcq' | 'passage';

type VerseView = {
  id: string;
  text: string;
  marker: string;
  surah?: number;
  ayah?: number;
};

type SentenceGroup = {
  unitId: string;
  verseArabic: string;
  surah?: number;
  ayah?: number;
  sentences: Array<{ arabic?: string; translation?: string | null }>;
};

@Component({
  selector: 'app-quran-lesson-study',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quran-lesson-study.component.html',
  styleUrls: ['./quran-lesson-study.component.scss'],
})
export class QuranLessonStudyComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private service = inject(QuranLessonService);
  private subs = new Subscription();

  private defaultText: QuranLesson['text'] = { arabic_full: [], mode: 'original' };

  lesson: QuranLesson | null = null;

  activeTab: StudyTab = 'study';

  selectedVerseId: string | null = null;
  selectedSentenceKey: string | null = null;
  selectedQuestionId: string | null = null;

  mcqSelections: Record<string, { selectedIndex: number; isCorrect: boolean }> = {};

  private audioContext?: AudioContext;

  // -----------------------------
  // VIEW HELPERS
  // -----------------------------

  get verseList(): VerseView[] {
    const list = this.lesson?.text?.arabic_full ?? [];

    return list
      .map((v) => {
        const id = (v.unit_id ?? '').trim();
        const text = (v.arabic_non_diacritics ?? v.arabic ?? '').trim();

        // Marker priority:
        // 1) verse_mark
        // 2) verse_full
        // 3) fallback: ﴿ayah﴾
        const marker = (
          v.verse_mark ??
          v.verse_full ??
          (v.ayah != null ? `﴿${v.ayah}﴾` : '')
        ).trim();

        return {
          id,
          text,
          marker,
          surah: v.surah ?? undefined,
          ayah: v.ayah ?? undefined,
        };
      })
      .filter((x) => x.id && x.text);
  }

  get arabicParagraph(): string {
    const verses = this.lesson?.text?.arabic_full ?? [];
    const verseText = verses
      .map((v) => v.arabic?.trim())
      .filter(Boolean) as string[];

    if (verseText.length) return verseText.join(' ');

    const sentences = this.lesson?.sentences ?? [];
    const sentenceText = sentences
      .map((s) => s.arabic?.trim())
      .filter(Boolean) as string[];

    return sentenceText.join(' ');
  }

  get sentenceGroups(): SentenceGroup[] {
    const sentences = this.lesson?.sentences ?? [];
    if (!sentences.length) return [];

    // O(1) verse lookup by unit_id
    const verseMap = new Map(
      (this.lesson?.text?.arabic_full ?? [])
        .filter((v) => !!v.unit_id)
        .map((v) => [
          v.unit_id as string,
          { arabic: v.arabic ?? '', surah: v.surah, ayah: v.ayah },
        ])
    );

    // O(1) group lookup by unitId
    const groupMap = new Map<string, SentenceGroup>();

    for (const s of sentences) {
      const unitId = (s.unit_id ?? '').trim();
      if (!unitId) continue;

      let group = groupMap.get(unitId);
      if (!group) {
        const verseInfo = verseMap.get(unitId);
        group = {
          unitId,
          verseArabic: verseInfo?.arabic ?? '',
          surah: verseInfo?.surah ?? undefined,
          ayah: verseInfo?.ayah ?? undefined,
          sentences: [],
        };
        groupMap.set(unitId, group);
      }

      group.sentences.push({
        arabic: s.arabic ?? undefined,
        translation: s.translation ?? null,
      });
    }

    return Array.from(groupMap.values());
  }

  get sentenceList() {
    return this.lesson?.sentences ?? [];
  }

  // -----------------------------
  // PASSAGE UNIT HELPERS
  // -----------------------------

  private get passageUnitEntry(): QuranLessonUnit | null {
    const units = this.lesson?.units ?? [];
    if (!units.length) return null;
    return units.find((u) => u.unit_type === 'passage') ?? units[0] ?? null;
  }

  get passageCacheText(): string {
    return (this.passageUnitEntry?.text_cache ?? '').trim();
  }

  get passageUnitLabel(): string {
    const unit = this.passageUnitEntry;
    if (!unit) return '';
    if (unit.start_ref && unit.end_ref) return `${unit.start_ref}-${unit.end_ref}`;
    return unit.start_ref ?? unit.end_ref ?? unit.unit_type ?? '';
  }

  // -----------------------------
  // MCQ + QUESTIONS
  // -----------------------------

  get mcqQuestions(): QuranLessonMcq[] {
    const mcqs = this.lesson?.comprehension?.mcqs;
    if (!mcqs) return [];
    if (Array.isArray(mcqs)) return mcqs;

    if (typeof mcqs === 'object' && mcqs !== null) {
      const typed = mcqs as {
        text?: QuranLessonMcq[];
        vocabulary?: QuranLessonMcq[];
        grammar?: QuranLessonMcq[];
      };
      return [
        ...(Array.isArray(typed.text) ? typed.text : []),
        ...(Array.isArray(typed.vocabulary) ? typed.vocabulary : []),
        ...(Array.isArray(typed.grammar) ? typed.grammar : []),
      ];
    }

    return [];
  }

  get reflectiveQuestions(): QuranLessonComprehensionQuestion[] {
    const q = this.lesson?.comprehension?.reflective;
    return Array.isArray(q) ? q : [];
  }

  get analyticalQuestions(): QuranLessonComprehensionQuestion[] {
    const q = this.lesson?.comprehension?.analytical;
    return Array.isArray(q) ? q : [];
  }

  get hasComprehensionQuestions(): boolean {
    return this.reflectiveQuestions.length > 0 || this.analyticalQuestions.length > 0;
  }

  getQuestionKey(q: QuranLessonComprehensionQuestion) {
    return q.question_id ?? q.question;
  }

  trackByVerseId(_: number, verse: VerseView) {
    return verse.id;
  }

  trackByGroupId(_: number, group: SentenceGroup) {
    return group.unitId;
  }

  trackByMcqId(_: number, mcq: QuranLessonMcq) {
    return mcq.mcq_id;
  }

  trackByQuestionKey(_: number, question: QuranLessonComprehensionQuestion) {
    return this.getQuestionKey(question);
  }

  // -----------------------------
  // UI ACTIONS
  // -----------------------------

  setActiveTab(tab: StudyTab) {
    this.activeTab = tab;
  }

  selectVerse(unitId: string) {
    const id = unitId?.trim() || null;
    this.selectedVerseId = this.selectedVerseId === id ? null : id;

    // if we de-select verse, also clear sentence selection
    if (!this.selectedVerseId) {
      this.selectedSentenceKey = null;
    }
  }

  sentenceKey(unitId: string, index: number) {
    return `${unitId}-${index}`;
  }

  selectSentence(unitId: string, index: number) {
    const key = `${unitId}-${index}`;
    if (this.selectedSentenceKey === key) {
      this.selectedSentenceKey = null;
      this.selectedVerseId = null;
      return;
    }
    this.selectedSentenceKey = key;
    this.selectedVerseId = unitId;
  }

  selectQuestion(q: QuranLessonComprehensionQuestion) {
    const id = this.getQuestionKey(q);
    if (!id) return;
    this.selectedQuestionId = this.selectedQuestionId === id ? null : id;
  }

  onMcqOptionSelect(mcqId: string, optionIndex: number, optionIsCorrect: boolean) {
    const current = this.mcqSelections[mcqId];
    if (current?.selectedIndex === optionIndex && current.isCorrect === optionIsCorrect) return;

    this.mcqSelections[mcqId] = { selectedIndex: optionIndex, isCorrect: optionIsCorrect };
    if (!optionIsCorrect) this.playErrorTone();
  }

  private playErrorTone() {
    const w = window as Window & {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };

    const AudioCtor = w.AudioContext ?? w.webkitAudioContext;
    if (!AudioCtor) return;

    if (!this.audioContext) this.audioContext = new AudioCtor();
    if (this.audioContext.state === 'suspended') this.audioContext.resume();

    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = 320;
    gain.gain.value = 0.2;

    oscillator.connect(gain);
    gain.connect(this.audioContext.destination);

    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);
    oscillator.stop(this.audioContext.currentTime + 0.25);
  }

  // -----------------------------
  // LIFECYCLE
  // -----------------------------

  ngOnInit() {
    this.subs.add(
      this.route.queryParamMap.subscribe((params) => {
        const tab = params.get('tab');
        this.activeTab =
          tab === 'mcq'
            ? 'mcq'
            : tab === 'passage'
              ? 'passage'
              : tab === 'sentences'
                ? 'sentences'
                : 'study';
      })
    );

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (Number.isFinite(id)) {
      this.subs.add(
        this.service.getLesson(id).subscribe({
          next: (lesson: QuranLesson) => {
            this.lesson = {
              ...lesson,
              text: lesson.text ?? { ...this.defaultText },
            };
          },
          error: () => (this.lesson = null),
        })
      );
    }
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
    this.audioContext?.close?.();
  }
}
