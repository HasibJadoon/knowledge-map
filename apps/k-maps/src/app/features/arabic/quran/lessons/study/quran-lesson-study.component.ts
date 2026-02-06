import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { QuranLessonService } from '../../../../../shared/services/quran-lesson.service';
import { TokensService } from '../../../../../shared/services/tokens.service';
import { PageHeaderService } from '../../../../../shared/services/page-header.service';
import { TokenRow } from '../../../../../shared/models/arabic/token.model';
import { PageHeaderTabsConfig } from '../../../../../shared/models/core/page-header.model';
import {
  QuranLesson,
  QuranLessonComprehensionQuestion,
  QuranLessonMcq,
  QuranLessonUnit,
} from '../../../../../shared/models/arabic/quran-lesson.model';

type StudyTab = 'study' | 'sentences' | 'mcq' | 'passage';
type StudyHeaderTab = 'reading' | 'memory' | 'mcq' | 'passage';
type McqSelection = { selectedIndex: number; isCorrect: boolean };

type VerseWordView = {
  key: string;
  surface: string;
  tokenIndex: number;
  pos?: string | null;
  wordLocation?: string;
  lemmaId?: number;
  lemmaText?: string;
  lemmaTextClean?: string;
  arUToken?: string | null;
};

type VerseView = {
  id: string;
  text: string;
  marker: string;
  words: VerseWordView[];
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

type AyahUnit = QuranLesson['text']['arabic_full'][number];
type LemmaLocation = NonNullable<AyahUnit['lemmas']>[number];

const ARABIC_DIACRITICS_RE = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;

@Component({
  selector: 'app-quran-lesson-study',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quran-lesson-study.component.html',
  styleUrls: ['./quran-lesson-study.component.scss'],
})
export class QuranLessonStudyComponent implements OnInit, OnDestroy {
  // =========================================================================
  // SEGMENT: Dependencies & State
  // =========================================================================

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(QuranLessonService);
  private readonly tokensService = inject(TokensService);
  private readonly pageHeaderService = inject(PageHeaderService);
  private readonly subs = new Subscription();
  private readonly defaultText: QuranLesson['text'] = { arabic_full: [], mode: 'original' };

  lesson: QuranLesson | null = null;
  activeTab: StudyTab = 'study';
  readingMode: 'verse' | 'reading' = 'verse';

  selectedVerseId: string | null = null;
  selectedSentenceKey: string | null = null;
  selectedQuestionId: string | null = null;
  activeWordKey: string | null = null;
  lexiconError: string | null = null;

  mcqSelections: Record<string, McqSelection> = {};

  private openingLexicon = false;
  private audioContext?: AudioContext;

  // =========================================================================
  // SEGMENT: Computed View Models
  // =========================================================================

  get verseList(): VerseView[] {
    return this.verseRows
      .map((verse): VerseView | null => {
        const id = (verse.unit_id ?? '').trim();
        const text = this.getVerseDisplayText(verse);
        if (!id || !text) return null;

        return {
          id,
          text,
          marker: this.getVerseMarker(verse),
          words: this.buildVerseWords(id, text, verse.lemmas ?? [], verse.surah, verse.ayah),
          surah: verse.surah ?? undefined,
          ayah: verse.ayah ?? undefined,
        };
      })
      .filter((verse): verse is VerseView => !!verse);
  }

  get sentenceGroups(): SentenceGroup[] {
    const sentences = this.lesson?.sentences ?? [];
    if (!sentences.length) return [];

    const verseMap = new Map<string, { arabic: string; surah?: number; ayah?: number }>();
    for (const verse of this.verseRows) {
      const unitId = (verse.unit_id ?? '').trim();
      if (!unitId) continue;
      verseMap.set(unitId, {
        arabic: verse.arabic ?? '',
        surah: verse.surah ?? undefined,
        ayah: verse.ayah ?? undefined,
      });
    }

    const groupMap = new Map<string, SentenceGroup>();
    for (const sentence of sentences) {
      const unitId = (sentence.unit_id ?? '').trim();
      if (!unitId) continue;

      let group = groupMap.get(unitId);
      if (!group) {
        const verseInfo = verseMap.get(unitId);
        group = {
          unitId,
          verseArabic: verseInfo?.arabic ?? '',
          surah: verseInfo?.surah,
          ayah: verseInfo?.ayah,
          sentences: [],
        };
        groupMap.set(unitId, group);
      }

      group.sentences.push({
        arabic: sentence.arabic ?? undefined,
        translation: sentence.translation ?? null,
      });
    }

    return Array.from(groupMap.values());
  }

  get passageCacheText(): string {
    const lines = this.verseRows
      .map((verse) => {
        const words = this.buildPassageVerseText(verse);
        if (!words) return '';
        const marker = this.getVerseMarker(verse);
        return marker ? `${words} ${marker}` : words;
      })
      .filter(Boolean);

    if (lines.length > 0) return lines.join('\n');

    const fallback = (this.passageUnitEntry?.text_cache ?? '').trim();
    return fallback ? this.stripArabicDiacritics(fallback) : '';
  }

  get readingText(): string {
    const lines = this.verseList.map((verse) => {
      const marker = verse.marker?.trim();
      return marker ? `${verse.text} ${marker}` : verse.text;
    });
    return lines.join(' ');
  }

  get passageUnitLabel(): string {
    const unit = this.passageUnitEntry;
    if (!unit) return '';
    if (unit.start_ref && unit.end_ref) return `${unit.start_ref}-${unit.end_ref}`;
    return unit.start_ref ?? unit.end_ref ?? unit.unit_type ?? '';
  }

  get mcqQuestions(): QuranLessonMcq[] {
    const mcqs = this.lesson?.comprehension?.mcqs;
    if (!mcqs) return [];
    if (Array.isArray(mcqs)) return mcqs;

    const grouped = mcqs as {
      text?: QuranLessonMcq[];
      vocabulary?: QuranLessonMcq[];
      grammar?: QuranLessonMcq[];
    };

    return [
      ...(Array.isArray(grouped.text) ? grouped.text : []),
      ...(Array.isArray(grouped.vocabulary) ? grouped.vocabulary : []),
      ...(Array.isArray(grouped.grammar) ? grouped.grammar : []),
    ];
  }

  get reflectiveQuestions(): QuranLessonComprehensionQuestion[] {
    const questions = this.lesson?.comprehension?.reflective;
    return Array.isArray(questions) ? questions : [];
  }

  get analyticalQuestions(): QuranLessonComprehensionQuestion[] {
    const questions = this.lesson?.comprehension?.analytical;
    return Array.isArray(questions) ? questions : [];
  }

  get hasComprehensionQuestions(): boolean {
    return this.reflectiveQuestions.length > 0 || this.analyticalQuestions.length > 0;
  }

  getQuestionKey(question: QuranLessonComprehensionQuestion) {
    return question.question_id ?? question.question ?? null;
  }

  // =========================================================================
  // SEGMENT: Template TrackBy
  // =========================================================================

  trackByVerseId(_: number, verse: VerseView) {
    return verse.id;
  }

  trackByWordKey(_: number, word: VerseWordView) {
    return word.key;
  }

  trackByGroupId(_: number, group: SentenceGroup) {
    return group.unitId;
  }

  trackByMcqId(_: number, mcq: QuranLessonMcq) {
    return mcq.mcq_id;
  }

  trackByQuestionKey = (_: number, question: QuranLessonComprehensionQuestion) =>
    this.getQuestionKey(question) ?? `${question.question ?? ''}-${_}`;

  // =========================================================================
  // SEGMENT: UI Actions
  // =========================================================================

  selectVerse(unitId: string) {
    const id = unitId.trim();
    this.selectedVerseId = this.selectedVerseId === id ? null : id;

    if (!this.selectedVerseId) {
      this.selectedSentenceKey = null;
    }
  }

  sentenceKey(unitId: string, index: number) {
    return `${unitId}-${index}`;
  }

  selectSentence(unitId: string, index: number) {
    const key = this.sentenceKey(unitId, index);
    if (this.selectedSentenceKey === key) {
      this.selectedSentenceKey = null;
      this.selectedVerseId = null;
      return;
    }

    this.selectedSentenceKey = key;
    this.selectedVerseId = unitId;
  }

  selectQuestion(question: QuranLessonComprehensionQuestion) {
    const id = this.getQuestionKey(question);
    if (!id) return;
    this.selectedQuestionId = this.selectedQuestionId === id ? null : id;
  }

  onMcqOptionSelect(mcqId: string, optionIndex: number, optionIsCorrect: boolean) {
    const current = this.mcqSelections[mcqId];
    if (current?.selectedIndex === optionIndex && current.isCorrect === optionIsCorrect) return;

    this.mcqSelections[mcqId] = { selectedIndex: optionIndex, isCorrect: optionIsCorrect };
    if (!optionIsCorrect) this.playErrorTone();
  }

  async onWordDoubleClick(event: MouseEvent, word: VerseWordView) {
    event.preventDefault();
    event.stopPropagation();

    if (this.openingLexicon) return;

    this.lexiconError = null;
    this.activeWordKey = word.key;

    const query = (word.lemmaTextClean ?? word.lemmaText ?? word.surface ?? '').trim();
    if (!query) {
      this.lexiconError = 'No lemma metadata for this word.';
      return;
    }

    this.openingLexicon = true;
    try {
      const token = await this.findTokenForWord(word, query);
      const root = token?.root?.trim();

      if (!root) {
        this.lexiconError = 'No lexicon entry found for this word.';
        return;
      }

      this.router.navigate(['/arabic/roots'], { queryParams: { q: root } });
    } catch (error: unknown) {
      this.lexiconError = error instanceof Error ? error.message : 'Unable to open lexicon.';
    } finally {
      this.openingLexicon = false;
    }
  }

  // =========================================================================
  // SEGMENT: Lifecycle
  // =========================================================================

  ngOnInit() {
    this.subs.add(
      this.route.queryParamMap.subscribe((params) => {
        this.activeTab = this.parseTab(params.get('tab'));
        this.syncPageHeaderTabs();
      })
    );

    const lessonId = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(lessonId)) return;

    this.subs.add(
      this.service.getLesson(lessonId).subscribe({
        next: (lesson: QuranLesson) => {
          this.lesson = {
            ...lesson,
            text: lesson.text ?? { ...this.defaultText },
          };
        },
        error: () => {
          this.lesson = null;
        },
      })
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
    this.pageHeaderService.clearTabs();
    this.audioContext?.close?.();
  }

  // =========================================================================
  // SEGMENT: Data Builders
  // =========================================================================

  private get verseRows(): AyahUnit[] {
    return this.lesson?.text?.arabic_full ?? [];
  }

  private get passageUnitEntry(): QuranLessonUnit | null {
    const units = this.lesson?.units ?? [];
    if (!units.length) return null;
    return units.find((unit) => unit.unit_type === 'passage') ?? units[0] ?? null;
  }

  private buildVerseWords(
    verseId: string,
    text: string,
    lemmas: NonNullable<AyahUnit['lemmas']>,
    surah?: number,
    ayah?: number
  ): VerseWordView[] {
    const posMap = this.buildTokenPosMap();
    const lemmasByToken = this.indexLemmasByToken(lemmas);
    const words = this.tokenizeWords(text);

    return words.map((rawWord, index) => {
      const tokenIndex = index + 1;
      const lemma = lemmasByToken.get(tokenIndex);
      const fallbackWordLocation =
        surah && ayah ? `${surah}:${ayah}:${tokenIndex}` : undefined;
      const posKey = lemma?.ar_u_token ? `u:${lemma.ar_u_token}` : null;
      const pos = posKey ? posMap.get(posKey) ?? null : null;

      const simpleWord = this.stripArabicDiacritics((lemma?.word_simple ?? '').trim());
      const plainWord = this.stripArabicDiacritics(rawWord);
      const surface = simpleWord || plainWord || rawWord;

      return {
        key: `${verseId}-${tokenIndex}`,
        surface,
        tokenIndex,
        pos,
        wordLocation: lemma?.word_location ?? fallbackWordLocation,
        lemmaId: lemma?.lemma_id,
        lemmaText: lemma?.lemma_text,
        lemmaTextClean: lemma?.lemma_text_clean,
        arUToken: lemma?.ar_u_token ?? null,
      };
    });
  }

  private buildTokenPosMap(): Map<string, string> {
    const map = new Map<string, string>();
    const tokens = this.lesson?.analysis?.tokens ?? [];
    for (const token of tokens) {
      if (!token?.u_token_id || !token.pos) continue;
      map.set(`u:${token.u_token_id}`, token.pos);
    }
    return map;
  }

  private buildPassageVerseText(verse: AyahUnit): string {
    const lemmas = Array.isArray(verse.lemmas) ? verse.lemmas : [];
    const simpleWords = [...lemmas]
      .filter((lemma) => Number.isFinite(lemma.token_index) && lemma.token_index > 0)
      .sort((a, b) => a.token_index - b.token_index)
      .map((lemma) => this.stripArabicDiacritics((lemma.word_simple ?? '').trim()))
      .filter(Boolean);

    if (simpleWords.length > 0) return simpleWords.join(' ');

    const fallback = (
      verse.arabic_non_diacritics ??
      verse.arabic_diacritics ??
      verse.arabic ??
      ''
    ).trim();

    return fallback ? this.stripArabicDiacritics(fallback) : '';
  }

  private indexLemmasByToken(lemmas: NonNullable<AyahUnit['lemmas']>): Map<number, LemmaLocation> {
    const byToken = new Map<number, LemmaLocation>();
    for (const lemma of lemmas) {
      const tokenIndex = Number(lemma.token_index);
      if (!Number.isFinite(tokenIndex) || tokenIndex <= 0) continue;
      if (!byToken.has(tokenIndex)) byToken.set(tokenIndex, lemma);
    }
    return byToken;
  }

  // =========================================================================
  // SEGMENT: Lexicon Lookup
  // =========================================================================

  private async findTokenForWord(word: VerseWordView, query: string): Promise<TokenRow | null> {
    const response = await this.tokensService.list({
      q: query,
      page: 1,
      pageSize: 50,
    });

    const rows = response?.results ?? [];
    if (!rows.length) return null;

    if (word.arUToken) {
      const byTokenId = rows.find((row) => row.id === word.arUToken);
      if (byTokenId) return byTokenId;
    }

    const targetLemmaNorm = this.normalizeWordKey(word.lemmaTextClean ?? query);
    if (targetLemmaNorm) {
      const byLemmaNorm = rows.find(
        (row) => this.normalizeWordKey(row.lemma_norm) === targetLemmaNorm
      );
      if (byLemmaNorm) return byLemmaNorm;
    }

    const targetLemmaAr = this.normalizeWordKey(word.lemmaText ?? word.surface);
    if (targetLemmaAr) {
      const byLemmaAr = rows.find(
        (row) => this.normalizeWordKey(row.lemma_ar) === targetLemmaAr
      );
      if (byLemmaAr) return byLemmaAr;
    }

    return rows.find((row) => !!row.root) ?? rows[0];
  }

  // =========================================================================
  // SEGMENT: Text Utilities
  // =========================================================================

  private getVerseDisplayText(verse: AyahUnit): string {
    return (verse.arabic_diacritics ?? verse.arabic ?? verse.arabic_non_diacritics ?? '').trim();
  }

  private getVerseMarker(verse: AyahUnit): string {
    return (
      verse.verse_mark ??
      verse.verse_full ??
      (verse.ayah != null ? `﴿${verse.ayah}﴾` : '')
    ).trim();
  }

  private syncPageHeaderTabs() {
    const lessonId = this.route.snapshot.paramMap.get('id');
    if (!lessonId) {
      this.pageHeaderService.clearTabs();
      return;
    }

    const baseCommands = ['/arabic/quran/lessons', lessonId, 'study'];
    const config: PageHeaderTabsConfig = {
      activeTabId: this.toHeaderTab(this.activeTab),
      tabs: [
        {
          id: 'reading',
          iconUrl: '/assets/images/app-icons/study-reading-tab.png',
          commands: baseCommands,
          queryParams: { tab: 'reading' },
        },
        {
          id: 'memory',
          iconUrl: '/assets/images/app-icons/study-vocab-tab.png',
          commands: baseCommands,
          queryParams: { tab: 'memory' },
        },
        {
          id: 'mcq',
          iconUrl: '/assets/images/app-icons/study-mcqs-tab.png',
          commands: baseCommands,
          queryParams: { tab: 'mcq' },
        },
        {
          id: 'passage',
          iconUrl: '/assets/images/app-icons/study-reflection-tab.png',
          commands: baseCommands,
          queryParams: { tab: 'passage' },
        },
      ],
      action: {
        label: 'Edit Lesson',
        commands: ['/arabic/quran/lessons', lessonId, 'edit'],
      },
    };
    this.pageHeaderService.setTabs(config);
  }

  private toHeaderTab(tab: StudyTab): StudyHeaderTab {
    switch (tab) {
      case 'sentences':
        return 'memory';
      case 'mcq':
        return 'mcq';
      case 'passage':
        return 'passage';
      default:
        return 'reading';
    }
  }

  private parseTab(tab: string | null): StudyTab {
    switch (tab) {
      case 'reading':
      case 'study':
        return 'study';
      case 'memory':
      case 'sentences':
        return 'sentences';
      case 'mcq':
        return 'mcq';
      case 'passage':
        return 'passage';
      default:
        return 'study';
    }
  }

  private tokenizeWords(text: string): string[] {
    return text
      .split(/\s+/)
      .map((word) => word.trim())
      .filter(Boolean);
  }

  private normalizeWordKey(text?: string | null): string {
    if (!text) return '';
    return this.stripArabicDiacritics(text).replace(/\s+/g, '').toLowerCase();
  }

  private stripArabicDiacritics(text: string): string {
    return text.normalize('NFKC').replace(ARABIC_DIACRITICS_RE, '').trim();
  }

  // =========================================================================
  // SEGMENT: Audio Feedback
  // =========================================================================

  private playErrorTone() {
    const withAudioCtor = window as Window & {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };

    const AudioCtor = withAudioCtor.AudioContext ?? withAudioCtor.webkitAudioContext;
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
}
