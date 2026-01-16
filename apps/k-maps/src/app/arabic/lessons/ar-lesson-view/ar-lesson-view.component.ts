import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { ArLessonsService } from '../../../shared/services/ar-lessons.service';

type LessonJson = {
  text?: {
    arabic?: string;
    translation?: string;
    reference?: string;
  };
  vocabulary?: Array<{ word?: string; root?: string; type?: string; meaning?: string }>;
  comprehension?: Array<any>;
};

@Component({
  selector: 'app-ar-lesson-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ar-lesson-view.component.html',
  styleUrls: ['./ar-lesson-view.component.scss']
})
export class ArLessonViewComponent implements OnInit {
  private lessons = inject(ArLessonsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  id: number | null = null;
  loading = false;
  error = '';

  title = '';
  lessonType = '';
  status = '';
  source = '';

  lessonJson: LessonJson = {};
  jsonText = '{}';
  compBlocks: Array<any> = [];
  activeTab: 'details' | 'json' = 'details';

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : null;
    if (id && Number.isFinite(id)) {
      this.id = id;
      this.load(id);
    }
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
      this.source = result.source ?? '';

      this.lessonJson = result.lesson_json ?? {};
      this.jsonText = JSON.stringify(this.lessonJson ?? {}, null, 2);
      this.compBlocks = Array.isArray(this.lessonJson?.comprehension)
        ? this.lessonJson.comprehension
        : [];
    } catch (err: any) {
      this.error = err?.message ?? 'Failed to load lesson';
    } finally {
      this.loading = false;
    }
  }

  back() {
    this.router.navigate(['/arabic/lessons']);
  }

  edit() {
    if (this.id) this.router.navigate(['/arabic/lessons', this.id, 'edit']);
  }

  statusBadgeClass(status: string) {
    const normalized = (status ?? '').toLowerCase();
    switch (normalized) {
      case 'published':
      case 'live':
        return 'bg-success';
      case 'review':
      case 'in_review':
        return 'bg-warning text-dark';
      case 'draft':
        return 'bg-secondary';
      case 'archived':
        return 'bg-dark';
      default:
        return 'bg-info text-dark';
    }
  }

  formatType(type?: string) {
    return String(type ?? 'section').replace(/_/g, ' ');
  }

  formatList(list?: Array<any>) {
    if (!Array.isArray(list) || list.length === 0) return '—';
    return list.map(item => String(item)).join(' ');
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
