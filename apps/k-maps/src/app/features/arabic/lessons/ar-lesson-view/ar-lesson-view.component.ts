import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { ArLessonsService } from '../../../../shared/services/ar-lessons.service';
import { ClassicLessonDetailsComponent } from './classic-lesson-details/classic-lesson-details.component';
import { QuranLessonDetailsComponent } from './quran-lesson-details/quran-lesson-details.component';

@Component({
  selector: 'app-ar-lesson-view',
  standalone: true,
  imports: [CommonModule, ClassicLessonDetailsComponent, QuranLessonDetailsComponent],
  templateUrl: './ar-lesson-view.component.html'
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

  lessonJson: Record<string, any> = {};
  jsonText = '{}';
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

  get isQuranLesson() {
    return (this.lessonType ?? '').toLowerCase() === 'quran';
  }

  isArabicText(text: string) {
    return /[\u0600-\u06FF]/.test(text ?? '');
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

}
