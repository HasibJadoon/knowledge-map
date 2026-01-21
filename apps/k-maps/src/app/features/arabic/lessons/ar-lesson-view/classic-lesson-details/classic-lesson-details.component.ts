import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

type LessonJson = {
  text?: {
    arabic?: string;
    translation?: string;
    reference?: string;
  };
  vocabulary?: Array<{
    word?: string;
    root?: string;
    type?: string;
    meaning?: string;
  }>;
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
}
