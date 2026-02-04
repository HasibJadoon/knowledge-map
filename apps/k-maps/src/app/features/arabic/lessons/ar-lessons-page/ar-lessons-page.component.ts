import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { ArLessonsService } from '../../../../shared/services/ar-lessons.service';
import { PageHeaderSearchService } from '../../../../shared/services/page-header-search.service';
import { ArLessonRow } from '../../../../shared/models/arabic/lesson-row.model';
import {
  AppCrudTableComponent,
  CrudTableAction,
  CrudTableActionEvent,
  CrudTableColumn
} from '../../../../shared/components';

@Component({
  selector: 'app-ar-lessons-page',
  standalone: true,
  imports: [CommonModule, AppCrudTableComponent],
  templateUrl: './ar-lessons-page.component.html',
  styleUrls: ['./ar-lessons-page.component.scss']
})
export class ArLessonsPageComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private lessons = inject(ArLessonsService);
  private pageHeaderSearch = inject(PageHeaderSearchService);

  q = '';
  rows: ArLessonRow[] = [];

  loading = false;
  error = '';
  lessonTypeFilter: 'all' | 'quran' | 'other' = 'quran';
  tableColumns: CrudTableColumn[] = [
    {
      key: 'title',
      label: 'Title',
      cellClass: (row) => (this.isArabicText(String(row['title'] ?? '')) ? 'app-table-arabic' : ''),
    },
    { key: 'lesson_type', label: 'Type' },
    {
      key: 'status',
      label: 'Status',
      type: 'badge',
      badgeClass: (row) => this.statusBadgeClass(String(row['status'] ?? '')),
    },
  ];
  tableActions: CrudTableAction[] = [
    { id: 'view', label: 'View', icon: 'view', variant: 'primary', outline: true },
    { id: 'study', label: 'Study', icon: 'study', variant: 'secondary', outline: true },
    { id: 'edit', label: 'Edit', icon: 'edit', variant: 'primary', outline: false },
  ];

  ngOnInit() {
    this.route.queryParamMap.subscribe((params) => {
      this.q = params.get('q') ?? '';
      const typeParam = params.get('lesson_type');
      this.lessonTypeFilter =
        typeParam === 'other' ? 'other' : typeParam === 'all' ? 'all' : 'quran';
      this.syncPageHeaderSearch();
      this.load();
    });
  }

  ngOnDestroy() {
    this.pageHeaderSearch.clearConfig();
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

  edit(row: { id: number; lesson_type: string }) {
    const prefix = this.getLessonPrefix(row.lesson_type);
    this.router.navigate(['/arabic/lessons', prefix, row.id, 'edit']);
  }

  study(row: { id: number; lesson_type: string }) {
    const prefix = this.getLessonPrefix(row.lesson_type);
    this.router.navigate(['/arabic/lessons', prefix, row.id, 'study']);
  }

  onViewRow(row: Record<string, unknown>) {
    const id = Number(row['id']);
    const lessonType = String(row['lesson_type'] ?? '');
    if (!Number.isFinite(id)) return;
    this.view(id, lessonType);
  }

  onEditRow(row: Record<string, unknown>) {
    const id = Number(row['id']);
    const lessonType = String(row['lesson_type'] ?? '');
    if (!Number.isFinite(id)) return;
    this.edit({ id, lesson_type: lessonType });
  }

  onStudyRow(row: Record<string, unknown>) {
    const id = Number(row['id']);
    const lessonType = String(row['lesson_type'] ?? '');
    if (!Number.isFinite(id)) return;
    this.study({ id, lesson_type: lessonType });
  }

  onTableAction(event: CrudTableActionEvent) {
    const row = event.row as Record<string, unknown>;
    if (event.id === 'view') {
      this.onViewRow(row);
      return;
    }
    if (event.id === 'study') {
      this.onStudyRow(row);
      return;
    }
    if (event.id === 'edit') {
      this.onEditRow(row);
    }
  }

  private getLessonPrefix(type?: string): 'quran' | 'literature' {
    return type?.toLowerCase() === 'quran' ? 'quran' : 'literature';
  }

  private syncPageHeaderSearch() {
    const target = this.lessonTypeFilter === 'other' ? 'literature' : 'quran';
    this.pageHeaderSearch.setConfig({
      placeholder: 'Search title or source',
      queryParamKey: 'q',
      primaryAction: {
        label: 'Add',
        commands: ['/arabic/lessons', target, 'new'],
      },
    });
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
