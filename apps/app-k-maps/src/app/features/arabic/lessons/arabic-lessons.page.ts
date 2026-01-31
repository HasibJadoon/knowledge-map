import { Component, OnInit, inject } from '@angular/core';
import { ArLessonsService, ArLesson } from '../../../shared/services/ar-lessons.service';

@Component({
  selector: 'app-arabic-lessons',
  templateUrl: './arabic-lessons.page.html',
  styleUrls: ['./arabic-lessons.page.scss'],
  standalone: false,
})
export class ArabicLessonsPage implements OnInit {
  lessons: ArLesson[] = [];
  loading = false;
  error = '';

  private readonly lessonsService = inject(ArLessonsService);

  ngOnInit(): void {
    this.loadLessons();
  }


  isArabicTitle(title?: string): boolean {
    if (!title) return false;
    return /[؀-ۿ]/.test(title);
  }

  statusClass(status?: string): string {
    const value = (status ?? '').toLowerCase();
    if (value.includes('draft')) return 'status-draft';
    if (value.includes('done')) return 'status-done';
    if (value.includes('publish')) return 'status-published';
    return 'status-default';
  }


  getSubtype(lesson: ArLesson): string {
    return (lesson.subtype ?? lesson.lesson_json?.subtype ?? '').toString();
  }

  getSource(lesson: ArLesson): string {
    return (lesson.source ?? lesson.lesson_json?.source ?? '').toString();
  }

  isUrl(value: string): boolean {
    return /^https?:\/\//i.test(value);
  }

  loadLessons(event?: CustomEvent): void {
    this.loading = true;
    this.error = '';

    this.lessonsService.list().subscribe({
      next: (response) => {
        const results = Array.isArray(response?.results) ? response.results : [];
        this.lessons = results;
        this.loading = false;
        if (event?.target && 'complete' in event.target) {
          (event.target as HTMLIonRefresherElement).complete();
        }
      },
      error: (err) => {
        const apiError = err?.error?.message || err?.error?.error;
        this.error = apiError || 'Failed to load lessons.';
        this.loading = false;
        if (event?.target && 'complete' in event.target) {
          (event.target as HTMLIonRefresherElement).complete();
        }
      },
    });
  }
}
