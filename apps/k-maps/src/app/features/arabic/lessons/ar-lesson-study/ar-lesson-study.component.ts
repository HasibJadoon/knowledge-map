import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { ArLessonsService } from '../../../../shared/services/ar-lessons.service';
import { GrammarNotesService } from '../../../../shared/services/grammar-notes.service';

type LessonJson = {
  text?: {
    arabic?: string;
    sentences?: string;
    translation?: string;
    reference?: string;
    mode?: 'quran' | 'text';
    arabic_full?: Array<{ arabic?: string }>;
  };
  sentences?: Array<{ arabic?: string; translation?: string }>;
  vocabulary?: Array<{ word?: string; root?: string; type?: string; meaning?: string }>;
  comprehension?: Array<any>;
};

@Component({
  selector: 'app-ar-lesson-study',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ar-lesson-study.component.html',
  styleUrls: ['./ar-lesson-study.component.scss']
})
export class ArLessonStudyComponent implements OnInit {
  private lessons = inject(ArLessonsService);
  private grammarNotesService = inject(GrammarNotesService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private clickSound = new Audio('assets/sounds/wine-glass.wav');

  id: number | null = null;
  loading = false;
  error = '';

  title = '';
  lessonType = '';
  status = '';
  textMode: 'quran' | 'text' = 'quran';
  source = '';

  lessonJson: LessonJson = {};
  activeTab: 'reading' | 'memory' | 'mcq' | 'passage' = 'reading';
  readingText = '';
  sentencesText = '';
  translationText = '';

  memoryBlock: any = null;
  passageBlock: any = null;
  memoryQuestions: string[] = [];
  mcqQuestions: string[] = [];
  passageQuestions: string[] = [];
  grammarNotes: Array<{ label?: string; note?: string; examples?: any }> = [];
  readingSegments: string[] = [];
  hoverIndex: number | null = null;
  selectedIndex: number | null = null;
  translationSegments: string[] = [];
  translationHoverIndex: number | null = null;
  translationSelectedIndex: number | null = null;
  sentenceSegments: string[] = [];
  sentenceLineSegments: string[][] = [];
  sentenceHoverIndex: number | null = null;
  sentenceSelectedIndex: number | null = null;
  verbSegments: string[] = [];
  nounSegments: string[] = [];
  verbHoverIndex: number | null = null;
  verbSelectedIndex: number | null = null;
  nounHoverIndex: number | null = null;
  nounSelectedIndex: number | null = null;
  memoryQuestionHoverIndex: number | null = null;
  memoryQuestionSelectedIndex: number | null = null;
  mcqQuestionHoverIndex: number | null = null;
  mcqQuestionSelectedIndex: number | null = null;
  passageQuestionHoverIndex: number | null = null;
  passageQuestionSelectedIndex: number | null = null;

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : null;
    if (id && Number.isFinite(id)) {
      this.id = id;
      this.load(id);
    }

    this.route.queryParamMap.subscribe((params) => {
      const tab = params.get('tab');
      if (tab === 'reading' || tab === 'memory' || tab === 'mcq' || tab === 'passage') {
        this.activeTab = tab;
      }
    });
  }

  async load(id: number) {
    this.loading = true;
    this.error = '';
    try {
      const data = await this.lessons.get(id);
      const result = (data as any)?.result;
      if (!result) throw new Error('Lesson not found');

      this.title = result.title ?? '';
      this.lessonType = result.lesson_type ?? '';
      this.status = result.status ?? '';
      this.textMode = result.lesson_json?.text?.mode === 'text' ? 'text' : 'quran';
      this.source = result.source ?? '';

      this.lessonJson = result.lesson_json ?? {};
      this.refreshDerivedText();
      const arabicText = (this.readingText ?? '').replace(/\s*\r?\n\s*/g, ' ');
      this.readingSegments = this.buildReadingSegments(arabicText);
      this.translationSegments = this.buildTranslationSegments(this.translationText);
      this.sentenceSegments = this.buildSentenceLines(this.sentencesText);
      this.sentenceLineSegments = this.sentenceSegments.map((line) => this.splitLineByMarkers(line));
      this.hoverIndex = null;
      this.selectedIndex = null;
      this.translationHoverIndex = null;
      this.translationSelectedIndex = null;
      this.sentenceHoverIndex = null;
      this.sentenceSelectedIndex = null;

      const blocks = Array.isArray(this.lessonJson?.comprehension)
        ? this.lessonJson.comprehension
        : [];

      this.memoryBlock = blocks.find((b: any) => b?.type === 'memory_recall') ?? null;
      this.passageBlock = blocks.find((b: any) => b?.type === 'passage_questions') ?? null;

      const rawMemory: string[] = Array.isArray(this.memoryBlock?.questions)
        ? this.memoryBlock.questions.map((q: any) => this.formatQuestionDisplay(q))
        : [];
      this.mcqQuestions = rawMemory.filter((q: string) => q.includes('/'));
      this.memoryQuestions = rawMemory.filter((q: string) => q && !q.includes('/'));
      this.verbSegments = this.buildWordSegments(this.memoryBlock?.verbs);
      this.nounSegments = this.buildWordSegments(this.memoryBlock?.nouns);
      this.verbHoverIndex = null;
      this.verbSelectedIndex = null;
      this.nounHoverIndex = null;
      this.nounSelectedIndex = null;
      this.memoryQuestionHoverIndex = null;
      this.memoryQuestionSelectedIndex = null;
      this.mcqQuestionHoverIndex = null;
      this.mcqQuestionSelectedIndex = null;
      this.passageQuestionHoverIndex = null;
      this.passageQuestionSelectedIndex = null;

      this.passageQuestions = Array.isArray(this.passageBlock?.questions)
        ? this.passageBlock.questions.map((q: any) => this.formatQuestionDisplay(q))
        : [];

      await this.loadGrammarNotes(id);
    } catch (err: any) {
      this.error = err?.message ?? 'Failed to load lesson';
    } finally {
      this.loading = false;
    }
  }

  back() {
    this.router.navigate(['/arabic/lessons']);
  }

  private async loadGrammarNotes(id: number) {
    try {
      const data = await this.grammarNotesService.list(id);
      const results = Array.isArray((data as any)?.results) ? (data as any).results : [];
      this.grammarNotes = results
        .map((n: any) => ({
          label: n?.label ?? '',
          note: n?.note ?? '',
          examples: n?.examples ?? null
        }))
        .filter((n: any) => n.note || n.label);
    } catch {
      this.grammarNotes = [];
    }
  }

  editLesson() {
    if (!this.id) return;
    this.router.navigate(['/arabic/lessons', this.id, 'edit']);
  }

  formatList(list?: Array<any>) {
    if (!Array.isArray(list) || list.length === 0) return '—';
    return list.map((item) => String(item)).join(' ');
  }

  formatQuestionDisplay(q: any) {
    if (!q) return '';
    const text = typeof q === 'string' ? q : String(q.question ?? q.text ?? '');
    return text.replace(/^\s*\d+\.\s*/, '');
  }

  formatGrammarExamples(examples: any) {
    if (!examples) return '';
    if (Array.isArray(examples)) {
      const values = examples.map((item) => (typeof item === 'string' ? item : JSON.stringify(item)));
      return values.join(' • ');
    }
    return typeof examples === 'string' ? examples : JSON.stringify(examples);
  }

  private refreshDerivedText() {
    this.readingText = this.buildReadingText();
    this.sentencesText = this.buildSentencesText();
    this.translationText = this.buildTranslationText();
  }

  private buildReadingText() {
    const textBlock = this.lessonJson.text ?? {};
    const direct = this.normalizeString(textBlock.arabic);
    if (direct) return direct;
    const units = Array.isArray(textBlock.arabic_full) ? textBlock.arabic_full : [];
    return this.joinStrings(units.map((unit) => unit?.arabic));
  }

  private buildSentencesText() {
    const direct = this.normalizeString(this.lessonJson.text?.sentences);
    if (direct) return direct;
    const sentences = Array.isArray(this.lessonJson.sentences) ? this.lessonJson.sentences : [];
    return this.joinStrings(sentences.map((sentence) => sentence?.arabic));
  }

  private buildTranslationText() {
    const direct = this.normalizeString(this.lessonJson.text?.translation);
    if (direct) return direct;
    const sentences = Array.isArray(this.lessonJson.sentences) ? this.lessonJson.sentences : [];
    return this.joinStrings(sentences.map((sentence) => sentence?.translation));
  }

  private joinStrings(values: Array<string | undefined | null>, separator = '\n') {
    const normalized = values
      .map((value) => this.normalizeString(value))
      .filter((value) => value.length > 0);
    return normalized.join(separator);
  }

  private normalizeString(value?: string | null) {
    if (!value) return '';
    return value.trim();
  }

  isArabicText(text: string) {
    return /[\u0600-\u06FF]/.test(text ?? '');
  }

  onReadingHover(index: number) {
    this.hoverIndex = index;
  }

  onReadingLeave() {
    this.hoverIndex = null;
  }

  onReadingSelect(index: number) {
    this.selectedIndex = index;
    this.playClickSound();
  }

  onReadingKeydown(event: KeyboardEvent) {
    if (!this.readingSegments.length) return;
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

    event.preventDefault();
    const current = this.selectedIndex ?? this.hoverIndex ?? -1;
    const delta = event.key === 'ArrowDown' ? 1 : -1;
    const next = Math.max(0, Math.min(this.readingSegments.length - 1, current + delta));
    this.selectedIndex = next;
  }

  isReadingHighlighted(index: number) {
    const active = this.hoverIndex ?? this.selectedIndex;
    return active === index;
  }

  getArabicDisplay(segment: string) {
    return segment;
  }

  isVerseMarker(segment: string) {
    return /﴿[0-9\u0660-\u0669\u06F0-\u06F9]+﴾/.test(segment);
  }

  onTranslationHover(index: number) {
    this.translationHoverIndex = index;
  }

  onTranslationLeave() {
    this.translationHoverIndex = null;
  }

  onTranslationSelect(index: number) {
    this.translationSelectedIndex = index;
    this.playClickSound();
  }

  onTranslationKeydown(event: KeyboardEvent) {
    if (!this.translationSegments.length) return;
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

    event.preventDefault();
    const current = this.translationSelectedIndex ?? this.translationHoverIndex ?? -1;
    const delta = event.key === 'ArrowDown' ? 1 : -1;
    const next = Math.max(0, Math.min(this.translationSegments.length - 1, current + delta));
    this.translationSelectedIndex = next;
  }

  isTranslationHighlighted(index: number) {
    const active = this.translationHoverIndex ?? this.translationSelectedIndex;
    return active === index;
  }

  getTranslationNumber(segment: string) {
    const match = segment.match(/^\s*(\d+)\.\s*/);
    return match ? `${match[1]}.` : '';
  }

  getTranslationText(segment: string) {
    return segment.replace(/^\s*\d+\.\s*/, '');
  }

  onSentenceHover(index: number) {
    this.sentenceHoverIndex = index;
  }

  onSentenceLeave() {
    this.sentenceHoverIndex = null;
  }

  onSentenceSelect(index: number) {
    this.sentenceSelectedIndex = index;
    this.playClickSound();
  }

  onSentenceKeydown(event: KeyboardEvent) {
    if (!this.sentenceSegments.length) return;
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

    event.preventDefault();
    const current = this.sentenceSelectedIndex ?? this.sentenceHoverIndex ?? -1;
    const delta = event.key === 'ArrowDown' ? 1 : -1;
    const next = Math.max(0, Math.min(this.sentenceSegments.length - 1, current + delta));
    this.sentenceSelectedIndex = next;
  }

  isSentenceHighlighted(index: number) {
    const active = this.sentenceHoverIndex ?? this.sentenceSelectedIndex;
    return active === index;
  }

  private splitLineByMarkers(line: string) {
    if (this.textMode !== 'quran') return [line];
    const segments: string[] = [];
    const markerRegex = /﴿[0-9\u0660-\u0669\u06F0-\u06F9]+﴾/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = markerRegex.exec(line)) !== null) {
      const end = markerRegex.lastIndex;
      if (match.index > lastIndex) {
        const before = line.slice(lastIndex, match.index);
        segments.push(before);
      }
      segments.push(match[0]);
      lastIndex = end;
    }

    if (lastIndex < line.length) {
      const tail = line.slice(lastIndex);
      segments.push(tail);
    }

    return segments;
  }

  onVerbHover(index: number) {
    this.verbHoverIndex = index;
  }

  onVerbLeave() {
    this.verbHoverIndex = null;
  }

  onVerbSelect(index: number) {
    this.verbSelectedIndex = index;
    this.playClickSound();
  }

  isVerbHighlighted(index: number) {
    const active = this.verbHoverIndex ?? this.verbSelectedIndex;
    return active === index;
  }

  onNounHover(index: number) {
    this.nounHoverIndex = index;
  }

  onNounLeave() {
    this.nounHoverIndex = null;
  }

  onNounSelect(index: number) {
    this.nounSelectedIndex = index;
    this.playClickSound();
  }

  isNounHighlighted(index: number) {
    const active = this.nounHoverIndex ?? this.nounSelectedIndex;
    return active === index;
  }

  onMemoryQuestionHover(index: number) {
    this.memoryQuestionHoverIndex = index;
  }

  onMemoryQuestionLeave() {
    this.memoryQuestionHoverIndex = null;
  }

  onMemoryQuestionSelect(index: number) {
    this.memoryQuestionSelectedIndex = index;
    this.playClickSound();
  }

  onMemoryQuestionKeydown(event: KeyboardEvent) {
    if (!this.memoryQuestions.length) return;
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

    event.preventDefault();
    const current = this.memoryQuestionSelectedIndex ?? this.memoryQuestionHoverIndex ?? -1;
    const delta = event.key === 'ArrowDown' ? 1 : -1;
    const next = Math.max(0, Math.min(this.memoryQuestions.length - 1, current + delta));
    this.memoryQuestionSelectedIndex = next;
  }

  isMemoryQuestionHighlighted(index: number) {
    const active = this.memoryQuestionHoverIndex ?? this.memoryQuestionSelectedIndex;
    return active === index;
  }

  onMcqQuestionHover(index: number) {
    this.mcqQuestionHoverIndex = index;
  }

  onMcqQuestionLeave() {
    this.mcqQuestionHoverIndex = null;
  }

  onMcqQuestionSelect(index: number) {
    this.mcqQuestionSelectedIndex = index;
    this.playClickSound();
  }

  onMcqQuestionKeydown(event: KeyboardEvent) {
    if (!this.mcqQuestions.length) return;
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

    event.preventDefault();
    const current = this.mcqQuestionSelectedIndex ?? this.mcqQuestionHoverIndex ?? -1;
    const delta = event.key === 'ArrowDown' ? 1 : -1;
    const next = Math.max(0, Math.min(this.mcqQuestions.length - 1, current + delta));
    this.mcqQuestionSelectedIndex = next;
  }

  isMcqQuestionHighlighted(index: number) {
    const active = this.mcqQuestionHoverIndex ?? this.mcqQuestionSelectedIndex;
    return active === index;
  }

  onPassageQuestionHover(index: number) {
    this.passageQuestionHoverIndex = index;
  }

  onPassageQuestionLeave() {
    this.passageQuestionHoverIndex = null;
  }

  onPassageQuestionSelect(index: number) {
    this.passageQuestionSelectedIndex = index;
    this.playClickSound();
  }

  private playClickSound() {
    try {
      this.clickSound.volume = 0.2;
      this.clickSound.currentTime = 0;
      void this.clickSound.play();
    } catch {
      // Ignore playback errors (autoplay restrictions, etc).
    }
  }

  onPassageQuestionKeydown(event: KeyboardEvent) {
    if (!this.passageQuestions.length) return;
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

    event.preventDefault();
    const current = this.passageQuestionSelectedIndex ?? this.passageQuestionHoverIndex ?? -1;
    const delta = event.key === 'ArrowDown' ? 1 : -1;
    const next = Math.max(0, Math.min(this.passageQuestions.length - 1, current + delta));
    this.passageQuestionSelectedIndex = next;
  }

  isPassageQuestionHighlighted(index: number) {
    const active = this.passageQuestionHoverIndex ?? this.passageQuestionSelectedIndex;
    return active === index;
  }

  private buildReadingSegments(text: string) {
    if (!text) return [];
    const segments: string[] = [];
    const markerRegex =
      this.textMode === 'quran'
        ? /﴿[0-9\u0660-\u0669\u06F0-\u06F9]+﴾|[.!?؟]/g
        : /[.!?؟]/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = markerRegex.exec(text)) !== null) {
      const end = markerRegex.lastIndex;
      const token = match[0];
      if (this.textMode === 'quran' && token.startsWith('﴿')) {
        const before = text.slice(lastIndex, match.index);
        if (before.length) segments.push(before);
        segments.push(token);
        lastIndex = end;
        continue;
      }

      const slice = text.slice(lastIndex, end);
      if (slice.length) segments.push(slice);
      lastIndex = end;
    }

    if (lastIndex < text.length) {
      const tail = text.slice(lastIndex);
      if (tail.length) segments.push(tail);
    }

    return segments;
  }

  private buildVerseLines(text: string) {
    if (!text) return [];
    const lines: string[] = [];
    const markerRegex = /﴿[0-9\u0660-\u0669\u06F0-\u06F9]+﴾/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = markerRegex.exec(text)) !== null) {
      const end = markerRegex.lastIndex;
      const line = text.slice(lastIndex, end);
      if (line.length) lines.push(line);
      lastIndex = end;
    }

    if (lastIndex < text.length) {
      const tail = text.slice(lastIndex);
      if (tail.length) lines.push(tail);
    }

    return lines;
  }

  private buildSentenceLines(text: string) {
    if (!text) return [];
    const rawLines = text.split(/\r?\n+/).filter((line) => line.length > 0);
    if (rawLines.length > 1) return rawLines;

    if (this.textMode === 'quran') {
      return this.buildVerseLines(text);
    }

    const segments: string[] = [];
    const punctuationRegex = /[.!?؟]/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = punctuationRegex.exec(text)) !== null) {
      const end = punctuationRegex.lastIndex;
      const slice = text.slice(lastIndex, end);
      if (slice.length) segments.push(slice);
      lastIndex = end;
    }

    if (lastIndex < text.length) {
      const tail = text.slice(lastIndex);
      if (tail.length) segments.push(tail);
    }

    return segments;
  }

  private buildTranslationSegments(text: string) {
    if (!text) return [];
    return text
      .split(/\r?\n+/)
      .map((segment) => segment.trim())
      .filter((segment) => segment !== '');
  }

  private buildWordSegments(list?: Array<any>) {
    if (!Array.isArray(list)) return [];
    return list
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0);
  }
}
