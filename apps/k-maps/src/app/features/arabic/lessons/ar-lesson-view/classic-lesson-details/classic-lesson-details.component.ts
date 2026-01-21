import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

type LessonJson = {
  text?: {
    arabic?: string;
    translation?: string;
    reference?: string;
    arabic_full?: Array<{ arabic?: string }>;
    sentences?: string;
  };
  vocabulary?: Array<{
    word?: string;
    root?: string;
    type?: string;
    meaning?: string;
  }>;
  sentences?: Array<{ arabic?: string; translation?: string }>;
  comprehension?: Array<Record<string, any>>;
};

@Component({
  selector: 'app-classic-lesson-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './classic-lesson-details.component.html',
  styleUrls: ['./classic-lesson-details.component.scss']
})
export class ClassicLessonDetailsComponent {
  @Input() lessonJson: LessonJson = {};

  get text() {
    return this.lessonJson.text ?? {};
  }

  get vocabulary() {
    return Array.isArray(this.lessonJson.vocabulary) ? this.lessonJson.vocabulary : [];
  }

  get compBlocks() {
    return Array.isArray(this.lessonJson.comprehension) ? this.lessonJson.comprehension : [];
  }

  formatType(type?: string) {
    return String(type ?? 'section').replace(/_/g, ' ');
  }

  formatList(list?: Array<any>) {
    if (!Array.isArray(list) || list.length === 0) return '—';
    return list.map((item) => String(item)).join(' ');
  }

  formatQuestion(q: any) {
    if (!q) return '';
    if (typeof q === 'string') return q;
    if (typeof q === 'object') return String(q.question ?? q.text ?? '');
    return String(q);
  }

  formatQuestionDisplay(q: any) {
    const text = this.formatQuestion(q);
    return text.replace(/^\s*\d+\.\s*/, '');
  }

  isArabicText(text: string) {
    return /[\u0600-\u06FF]/.test(text);
  }

  questionClass(q: any) {
    const text = this.formatQuestionDisplay(q);
    return this.isArabicText(text) ? 'arabic-question' : '';
  }

  extractQuestionNumber(text: string) {
    const match = /^\s*(\d+)\./.exec(text);
    return match ? Number(match[1]) : null;
  }

  shouldInsertBreak(questions: Array<any>, index: number) {
    if (!Array.isArray(questions) || index <= 0) return false;
    const current = this.extractQuestionNumber(this.formatQuestion(questions[index]));
    const prev = this.extractQuestionNumber(this.formatQuestion(questions[index - 1]));
    if (current == null || prev == null) return false;
    return current < prev;
  }

  get derivedArabicText() {
    const direct = this.normalizeString(this.text?.arabic);
    if (direct) return direct;
    const units = Array.isArray(this.text?.arabic_full) ? this.text.arabic_full : [];
    return this.joinStrings(units.map((unit) => unit?.arabic));
  }

  get derivedTranslationText() {
    const direct = this.normalizeString(this.text?.translation);
    if (direct) return direct;
    const translations = Array.isArray(this.lessonJson.sentences)
      ? this.lessonJson.sentences.map((sentence) => sentence?.translation)
      : [];
    return this.joinStrings(translations);
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
}
