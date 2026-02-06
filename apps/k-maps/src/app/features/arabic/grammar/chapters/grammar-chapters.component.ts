import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppHeaderbarComponent } from '../../../../shared/components';
import {
  PageHeaderFilterChangeEvent,
  PageHeaderFilterConfig,
} from '../../../../shared/models/core/page-header.model';
import { GrammarService } from '../../../../shared/services/grammar.service';
import { ToastService } from '../../../../shared/services/toast.service';

type GrammarSource = {
  id: number;
  title: string;
  identifier: string;
};

type GrammarUnit = {
  id: string;
  parent_id: string | null;
  unit_type: string;
  order_index: number | null;
  title: string | null;
  title_ar: string | null;
  source_identifier?: string | null;
  start_page: number | null;
  end_page: number | null;
  meta: Record<string, unknown>;
};

type GrammarItem = {
  id: string;
  unit_id: string;
  item_type: string;
  title: string | null;
  content: string;
  content_ar: string | null;
  order_index: number | null;
  meta: Record<string, unknown>;
};

@Component({
  selector: 'app-grammar-chapters',
  standalone: true,
  imports: [CommonModule, FormsModule, AppHeaderbarComponent],
  templateUrl: './grammar-chapters.component.html',
  styleUrls: ['./grammar-chapters.component.scss'],
})
export class GrammarChaptersComponent implements OnInit {
  sources: GrammarSource[] = [];
  selectedSource = '';
  books: GrammarUnit[] = [];
  selectedBook = '';
  chapters: GrammarUnit[] = [];
  lessons: GrammarItem[] = [];
  selectedChapter: GrammarUnit | null = null;

  q = '';
  loading = false;
  error = '';

  showChapterModal = false;
  showLessonModal = false;
  chapterForm: any = this.blankChapterForm();
  lessonForm: any = this.blankLessonForm();

  constructor(
    private grammar: GrammarService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.loadSources();
  }

  get headerFilters(): PageHeaderFilterConfig[] {
    return [
      {
        id: 'source',
        queryParamKey: 'source',
        value: this.selectedSource,
        options: [
          { value: '', label: 'All sources' },
          ...this.sources.map((s) => ({ value: s.identifier, label: s.title })),
        ],
        resetPageOnChange: false,
      },
      {
        id: 'book',
        queryParamKey: 'book',
        value: this.selectedBook,
        options: [
          { value: '', label: 'All books' },
          ...this.books.map((b) => ({
            value: b.id,
            label: b.title ?? 'Untitled',
          })),
        ],
        resetPageOnChange: false,
      },
    ];
  }

  get filteredChapters() {
    const q = this.q.toLowerCase();
    if (!q) return this.chapters;
    return this.chapters.filter((c) => {
      const title = `${c.title ?? ''} ${c.title_ar ?? ''}`.toLowerCase();
      return title.includes(q);
    });
  }

  get filteredLessons() {
    const q = this.q.toLowerCase();
    if (!q) return this.lessons;
    return this.lessons.filter((l) => {
      const title = `${l.title ?? ''} ${l.content_ar ?? ''}`.toLowerCase();
      return title.includes(q);
    });
  }

  onHeaderSearchInput(value: string) {
    this.q = value || '';
  }

  onHeaderFilterChange(event: PageHeaderFilterChangeEvent) {
    if (event.id === 'source') {
      this.selectedSource = event.value;
      this.selectedBook = '';
      this.loadChapters();
    }
    if (event.id === 'book') {
      this.selectedBook = event.value;
      this.loadChapters();
    }
  }

  async loadSources() {
    this.loading = true;
    this.error = '';
    try {
      const data = await this.grammar.listSources();
      this.sources = data?.results ?? [];
      if (!this.selectedSource && this.sources.length) {
        this.selectedSource = this.sources[0].identifier;
      }
      await this.loadChapters();
    } catch (err: any) {
      this.error = err?.message ?? 'Failed to load sources.';
    } finally {
      this.loading = false;
    }
  }

  async loadChapters() {
    this.loading = true;
    this.error = '';
    try {
      const [booksRes, chaptersRes] = await Promise.all([
        this.grammar.listUnits({
          source: this.selectedSource || undefined,
          unit_type: 'book',
        }),
        this.grammar.listUnits({
          source: this.selectedSource || undefined,
          unit_type: 'chapter',
          parent_id: this.selectedBook || undefined,
        }),
      ]);
      this.books = booksRes?.units ?? [];
      this.chapters = chaptersRes?.units ?? [];

      if (this.selectedBook && !this.books.find((b) => b.id === this.selectedBook)) {
        this.selectedBook = '';
      }

      if (!this.selectedChapter || !this.chapters.find((c) => c.id === this.selectedChapter?.id)) {
        this.selectedChapter = this.chapters[0] ?? null;
      }
      await this.loadLessons();
    } catch (err: any) {
      this.error = err?.message ?? 'Failed to load chapters.';
    } finally {
      this.loading = false;
    }
  }

  async loadLessons() {
    if (!this.selectedChapter) {
      this.lessons = [];
      return;
    }
    try {
      const data = await this.grammar.listUnitItems(this.selectedChapter.id);
      this.lessons = data?.results ?? [];
    } catch (err: any) {
      this.error = err?.message ?? 'Failed to load lessons.';
    }
  }

  selectChapter(chapter: GrammarUnit) {
    this.selectedChapter = chapter;
    this.loadLessons();
  }

  openNewChapter() {
    this.chapterForm = this.blankChapterForm();
    this.showChapterModal = true;
  }

  openEditChapter(chapter: GrammarUnit) {
    this.chapterForm = {
      id: chapter.id,
      title: chapter.title ?? '',
      title_ar: chapter.title_ar ?? '',
      order_index: chapter.order_index ?? 1,
      start_page: chapter.start_page ?? '',
      end_page: chapter.end_page ?? '',
      book_id: chapter.parent_id ?? '',
      status: (chapter.meta?.['status'] as string) ?? 'draft',
    };
    this.showChapterModal = true;
  }

  closeChapterModal() {
    this.showChapterModal = false;
  }

  async saveChapter() {
    const payload = {
      title: this.chapterForm.title,
      title_ar: this.chapterForm.title_ar,
      unit_type: 'chapter',
      parent_id: this.chapterForm.book_id || null,
      order_index: Number(this.chapterForm.order_index) || null,
      start_page: Number(this.chapterForm.start_page) || null,
      end_page: Number(this.chapterForm.end_page) || null,
      source_identifier: this.selectedSource || null,
      meta: {
        status: this.chapterForm.status || 'draft',
      },
    };

    try {
      if (this.chapterForm.id) {
        await this.grammar.updateUnit(this.chapterForm.id, payload);
        this.toast.show('Chapter updated', 'success');
      } else {
        await this.grammar.createUnit(payload);
        this.toast.show('Chapter created', 'success');
      }
      this.showChapterModal = false;
      await this.loadChapters();
    } catch (err: any) {
      this.toast.show(err?.message ?? 'Failed to save chapter', 'error');
    }
  }

  async deleteChapter(chapter: GrammarUnit) {
    if (!confirm('Delete this chapter?')) return;
    try {
      await this.grammar.deleteUnit(chapter.id);
      this.toast.show('Chapter deleted', 'success');
      await this.loadChapters();
    } catch (err: any) {
      this.toast.show(err?.message ?? 'Failed to delete chapter', 'error');
    }
  }

  openNewLesson() {
    if (!this.selectedChapter) {
      this.toast.show('Select a chapter first.', 'error');
      return;
    }
    this.lessonForm = this.blankLessonForm();
    this.showLessonModal = true;
  }

  openEditLesson(lesson: GrammarItem) {
    const meta = lesson.meta ?? {};
    this.lessonForm = {
      id: lesson.id,
      title: lesson.title ?? '',
      content: lesson.content ?? '',
      content_ar: lesson.content_ar ?? '',
      order_index: lesson.order_index ?? 1,
      lesson_no: (meta['lesson_no'] as string) ?? '',
      pages: (meta['pages'] as string) ?? '',
      status: (meta['status'] as string) ?? 'draft',
      grammar_nodes: Array.isArray(meta['grammar_nodes'])
        ? (meta['grammar_nodes'] as string[]).join(', ')
        : '',
    };
    this.showLessonModal = true;
  }

  closeLessonModal() {
    this.showLessonModal = false;
  }

  async saveLesson() {
    if (!this.selectedChapter) return;

    const grammarNodes = String(this.lessonForm.grammar_nodes || '')
      .split(',')
      .map((v: string) => v.trim())
      .filter(Boolean);

    const meta = {
      lesson_no: this.lessonForm.lesson_no || null,
      pages: this.lessonForm.pages || null,
      status: this.lessonForm.status || 'draft',
      grammar_nodes: grammarNodes,
    };

    const payload = {
      unit_id: this.selectedChapter.id,
      item_type: 'lesson',
      title: this.lessonForm.title,
      content: this.lessonForm.content || '',
      content_ar: this.lessonForm.content_ar || null,
      order_index: Number(this.lessonForm.order_index) || null,
      meta,
    };

    try {
      if (this.lessonForm.id) {
        await this.grammar.updateUnitItem(this.lessonForm.id, payload);
        this.toast.show('Lesson updated', 'success');
      } else {
        await this.grammar.createUnitItem(payload);
        this.toast.show('Lesson created', 'success');
      }
      this.showLessonModal = false;
      await this.loadLessons();
    } catch (err: any) {
      this.toast.show(err?.message ?? 'Failed to save lesson', 'error');
    }
  }

  async duplicateLesson(lesson: GrammarItem) {
    if (!this.selectedChapter) return;
    try {
      const meta = lesson.meta ?? {};
      const payload = {
        unit_id: this.selectedChapter.id,
        item_type: lesson.item_type ?? 'lesson',
        title: `${lesson.title ?? 'Lesson'} (Copy)`,
        content: lesson.content ?? '',
        content_ar: lesson.content_ar ?? null,
        order_index: (lesson.order_index ?? 0) + 1,
        meta,
      };
      await this.grammar.createUnitItem(payload);
      this.toast.show('Lesson duplicated', 'success');
      await this.loadLessons();
    } catch (err: any) {
      this.toast.show(err?.message ?? 'Failed to duplicate lesson', 'error');
    }
  }

  async deleteLesson(lesson: GrammarItem) {
    if (!confirm('Delete this lesson?')) return;
    try {
      await this.grammar.deleteUnitItem(lesson.id);
      this.toast.show('Lesson deleted', 'success');
      await this.loadLessons();
    } catch (err: any) {
      this.toast.show(err?.message ?? 'Failed to delete lesson', 'error');
    }
  }

  exportLesson(lesson: GrammarItem) {
    const payload = JSON.stringify(lesson, null, 2);
    navigator.clipboard?.writeText(payload).then(() => {
      this.toast.show('Lesson JSON copied', 'success');
    }).catch(() => {
      this.toast.show(payload, 'info');
    });
  }

  lessonNodes(lesson: GrammarItem): string[] {
    const nodes = lesson.meta?.['grammar_nodes'];
    return Array.isArray(nodes) ? (nodes as string[]) : [];
  }

  private blankChapterForm() {
    return {
      id: '',
      title: '',
      title_ar: '',
      order_index: 1,
      start_page: '',
      end_page: '',
      book_id: this.selectedBook || this.books[0]?.id || '',
      status: 'draft',
    };
  }

  private blankLessonForm() {
    return {
      id: '',
      title: '',
      content: '',
      content_ar: '',
      order_index: 1,
      lesson_no: '',
      pages: '',
      status: 'draft',
      grammar_nodes: '',
    };
  }
}
