import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ArLessonsService } from '../../../../shared/services/ar-lessons.service';

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
  rows: Array<{
    id: number;
    title: string;
    lesson_type: string;
    status: string;
    created_at?: string;
    updated_at?: string;
  }> = [];

  loading = false;
  error = '';
  private debounce?: ReturnType<typeof setTimeout>;

  ngOnInit() {
    this.route.queryParamMap.subscribe((params) => {
      this.q = params.get('q') ?? '';
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
      const data = await this.lessons.list(this.q ? { q: this.q, limit: '100' } : { limit: '100' });
      this.rows = Array.isArray((data as any)?.results) ? (data as any).results : [];
    } catch (err: any) {
      this.error = err?.message ?? 'Failed to load lessons';
      this.rows = [];
    } finally {
      this.loading = false;
    }
  }

  createNew() {
    this.router.navigate(['/arabic/lessons/new']);
  }

  openClaudeConsole() {
    this.router.navigate(['/arabic/lessons/claude']);
  }

  view(id: number) {
    this.router.navigate(['/arabic/lessons', id]);
  }

  study(id: number) {
    this.router.navigate(['/arabic/lessons', id, 'study']);
  }

  edit(id: number) {
    this.router.navigate(['/arabic/lessons', id, 'edit']);
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
