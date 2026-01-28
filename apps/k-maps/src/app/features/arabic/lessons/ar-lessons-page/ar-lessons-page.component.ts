import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ArLessonsService } from '../../../../shared/services/ar-lessons.service';
import { ArLessonRow } from '../../../../shared/models/arabic/lesson-row.model';

@Component({
  selector: 'app-ar-lessons-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ar-lessons-page.component.html',
  styleUrls: ['./ar-lessons-page.component.scss']
})
export class ArLessonsPageComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private lessons = inject(ArLessonsService);

  q = '';
  rows: ArLessonRow[] = [];

  loading = false;
  error = '';
  lessonTypeFilter: 'all' | 'quran' | 'other' = 'quran';
  private debounce?: ReturnType<typeof setTimeout>;

  ngOnInit() {
    this.route.queryParamMap.subscribe((params) => {
      this.q = params.get('q') ?? '';
      const typeParam = params.get('lesson_type');
      this.lessonTypeFilter =
        typeParam === 'other' ? 'other' : typeParam === 'all' ? 'all' : 'quran';
      this.load();
    });
  }

  onSearchInput() {
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = setTimeout(() => this.load(), 250);
  }

  async load() {
    this.loading = true;
    this.error = '';
    try {
      const params: Record<string, string> = { limit: '100' };
      if (this.q) params['q'] = this.q;
      if (this.lessonTypeFilter === 'quran') {
        params['lesson_type'] = 'quran';
      } else if (this.lessonTypeFilter === 'other') {
        params['lesson_type'] = 'other';
      }
      const data = await this.lessons.list(params);
      this.rows = Array.isArray((data as any)?.results) ? (data as any).results : [];
    } catch (err: any) {
      this.error = err?.message ?? 'Failed to load lessons';
      this.rows = [];
    } finally {
      this.loading = false;
    }
  }

  createNew() {
    const target = this.lessonTypeFilter === 'other' ? 'literature' : 'quran';
    this.router.navigate(['/arabic/lessons', target, 'new']);
  }

  selectLessonType(type: 'all' | 'quran' | 'other') {
    if (this.lessonTypeFilter === type) return;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { lesson_type: type === 'all' ? null : type },
      queryParamsHandling: 'merge',
    });
  }

  view(id: number, type: string) {
    const prefix = this.getLessonPrefix(type);
    this.router.navigate(['/arabic/lessons', prefix, id, 'view']);
  }

  study(row: { id: number; lesson_type: string }) {
    const prefix = this.getLessonPrefix(row.lesson_type);
    this.router.navigate(['/arabic/lessons', prefix, row.id, 'study']);
  }

  edit(row: { id: number; lesson_type: string }) {
    const prefix = this.getLessonPrefix(row.lesson_type);
    this.router.navigate(['/arabic/lessons', prefix, row.id, 'edit']);
  }

  private getLessonPrefix(type?: string): 'quran' | 'literature' {
    return type?.toLowerCase() === 'quran' ? 'quran' : 'literature';
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

  isArabicText(text: string) {
    return /[\u0600-\u06FF]/.test(text ?? '');
  }
}
