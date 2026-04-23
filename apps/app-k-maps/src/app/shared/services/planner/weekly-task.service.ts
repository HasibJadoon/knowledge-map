import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface WeeklyTaskSubtask {
  id: string;
  key: string;
  title: string;
  status: 'todo';
  order_index: number;
}

export interface PushToWeeklyTaskPayload {
  workspace_id: number;
  unit_id: string;
  container_id: string;
  origin_type:
    | 'quran_unit'
    | 'arabic_book_unit'
    | 'arabic_multimedia_unit'
    | 'arabic_literature_unit';
  display_name: string;
  uri: string;
  task_scope: 'unit';
  target_bucket: string;
  subtasks: WeeklyTaskSubtask[];
}

export interface PushToWeeklyTaskResult {
  action: 'created' | 'existing';
  task_id: number;
}

@Injectable({ providedIn: 'root' })
export class WeeklyTaskService {
  private http = inject(HttpClient);
  private base: string = (environment as Record<string, unknown>)['apiBase'] as string ?? '';

  pushToWeeklyTask(payload: PushToWeeklyTaskPayload): Observable<PushToWeeklyTaskResult> {
    return this.http.post<PushToWeeklyTaskResult>(
      `${this.base}/planner/push-to-weekly-task`,
      payload
    );
  }

  static buildQuranSubtasks(): WeeklyTaskSubtask[] {
    return [
      { id: crypto.randomUUID(), key: 'reading',            title: 'Reading',            status: 'todo', order_index: 1 },
      { id: crypto.randomUUID(), key: 'sentence_structure', title: 'Sentence Structure',  status: 'todo', order_index: 2 },
      { id: crypto.randomUUID(), key: 'morphology',         title: 'Morphology',          status: 'todo', order_index: 3 },
      { id: crypto.randomUUID(), key: 'expressions',        title: 'Expressions',         status: 'todo', order_index: 4 },
      { id: crypto.randomUUID(), key: 'comprehension',      title: 'Comprehension',       status: 'todo', order_index: 5 },
      { id: crypto.randomUUID(), key: 'passage_structure',  title: 'Passage Structure',   status: 'todo', order_index: 6 },
    ];
  }

  static buildArabicBookSubtasks(): WeeklyTaskSubtask[] {
    return [
      { id: crypto.randomUUID(), key: 'reading',               title: 'Reading',                  status: 'todo', order_index: 1 },
      { id: crypto.randomUUID(), key: 'exercises',             title: 'Exercises',                status: 'todo', order_index: 2 },
      { id: crypto.randomUUID(), key: 'vocabulary_expressions',title: 'Vocabulary + Expressions', status: 'todo', order_index: 3 },
    ];
  }

  static buildArabicMultimediaSubtasks(): WeeklyTaskSubtask[] {
    return [
      { id: crypto.randomUUID(), key: 'watch',                 title: 'Watch',                    status: 'todo', order_index: 1 },
      { id: crypto.randomUUID(), key: 'follow_along',          title: 'Follow Along',             status: 'todo', order_index: 2 },
      { id: crypto.randomUUID(), key: 'vocabulary_expressions',title: 'Vocabulary + Expressions', status: 'todo', order_index: 3 },
    ];
  }

  static buildArabicLiteratureSubtasks(): WeeklyTaskSubtask[] {
    return [
      { id: crypto.randomUUID(), key: 'reading',               title: 'Reading',                  status: 'todo', order_index: 1 },
      { id: crypto.randomUUID(), key: 'vocabulary_expressions',title: 'Vocabulary + Expressions', status: 'todo', order_index: 2 },
      { id: crypto.randomUUID(), key: 'notes_reflection',      title: 'Notes / Reflection',       status: 'todo', order_index: 3 },
    ];
  }
}
