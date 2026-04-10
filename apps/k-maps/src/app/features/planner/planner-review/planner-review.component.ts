import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

type ReviewCategoryId = 'quran' | 'arabic' | 'world' | 'srs_review';

interface ReviewSummary {
  tasks_done: number;
  tasks_total: number;
  minutes_spent: number;
  capture_notes: number;
  promoted_notes: number;
}

interface ReviewTask {
  id: string;
  title: string;
  task_type: string;
  related_node_title: string | null;
  item_json: {
    lane: 'lesson' | 'podcast' | 'notes' | 'admin';
    status: 'planned' | 'todo' | 'doing' | 'blocked' | 'done' | 'skipped';
    estimate_min: number;
    actual_min: number | null;
    assignment: {
      ar_lesson_id: number | null;
      topic: string | null;
    };
  };
}

interface ReviewRow {
  category_id: ReviewCategoryId;
  category_label: string;
  worked_well: string;
  needs_improvement: string;
  whats_next: string;
  appreciations: string;
}

interface ReviewDraft {
  retroRows: ReviewRow[];
  comments: string;
  finalThoughts: string;
  carryOverIds: string[];
}

interface ReviewData {
  created_at: string;
  updated_at: string | null;
}

export interface PlannerReviewPayload {
  schema_version: 1;
  title: string;
  outcomes: Array<{ label: string; status: 'partial' | 'done' | 'missed' }>;
  metrics: {
    tasks_done: number;
    tasks_total: number;
    minutes_spent: number;
    capture_notes: number;
    promoted_notes: number;
  };
  what_worked: string[];
  what_blocked: string[];
  carry_over_task_ids: string[];
  next_week_focus: string[];
  appreciations: string[];
  retro_rows: ReviewRow[];
  comments: string[];
  final_thoughts: string[];
}

@Component({
  selector: 'km-planner-review',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './planner-review.component.html',
  styleUrl: './planner-review.component.scss',
})
export class PlannerReviewComponent {
  @Input({ required: true }) weekLabel!: string;
  @Input({ required: true }) draft!: ReviewDraft;
  @Input({ required: true }) summary!: ReviewSummary;
  @Input({ required: true }) tasks!: ReviewTask[];
  @Input() review: ReviewData | null = null;
  @Input() saving = false;

  @Output() draftChange = new EventEmitter<ReviewDraft>();
  @Output() saveRequested = new EventEmitter<void>();

  readonly categories: Array<{ id: ReviewCategoryId; serial: string; label: string; icon: string }> = [
    { id: 'quran', serial: 'Cat 01', label: 'Quran', icon: '◇' },
    { id: 'arabic', serial: 'Cat 02', label: 'Arabic', icon: '◈' },
    { id: 'world', serial: 'Cat 03', label: 'World', icon: '◆' },
    { id: 'srs_review', serial: 'Cat 04', label: 'SRS Review', icon: '✦' },
  ];

  readonly columns: Array<{ key: keyof ReviewRow; label: string; tone: string }> = [
    { key: 'worked_well', label: 'Worked Well', tone: 'cream' },
    { key: 'needs_improvement', label: 'Needs Improvement', tone: 'paper' },
    { key: 'whats_next', label: "What's Next", tone: 'teal' },
    { key: 'appreciations', label: 'Appreciations', tone: 'coral' },
  ];

  reviewRows(): ReviewRow[] {
    if (this.draft?.retroRows?.length) {
      return this.draft.retroRows;
    }

    return this.categories.map((category) => ({
      category_id: category.id,
      category_label: category.label,
      worked_well: '',
      needs_improvement: '',
      whats_next: '',
      appreciations: '',
    }));
  }

  selectedCarryOverCount(): number {
    return this.draft?.carryOverIds?.length ?? 0;
  }

  reviewTasks(): ReviewTask[] {
    return this.tasks.filter((task) => task.item_json.status !== 'done' && task.item_json.status !== 'skipped');
  }

  categoryMeta(categoryId: ReviewCategoryId) {
    return this.categories.find((category) => category.id === categoryId) ?? this.categories[0];
  }

  fieldValue(row: ReviewRow, key: keyof ReviewRow): string {
    const value = row[key];
    return typeof value === 'string' ? value : '';
  }

  updateField(categoryId: ReviewCategoryId, key: keyof ReviewRow, value: string): void {
    this.draftChange.emit({
      ...this.draft,
      retroRows: this.reviewRows().map((row) =>
        row.category_id === categoryId ? { ...row, [key]: value } : row
      ),
    });
  }

  updateComments(value: string): void {
    this.draftChange.emit({
      ...this.draft,
      comments: value,
    });
  }

  updateFinalThoughts(value: string): void {
    this.draftChange.emit({
      ...this.draft,
      finalThoughts: value,
    });
  }

  isCarryOverTask(taskId: string): boolean {
    return this.draft.carryOverIds.includes(taskId);
  }

  toggleCarryOverTask(taskId: string): void {
    this.draftChange.emit({
      ...this.draft,
      carryOverIds: this.isCarryOverTask(taskId)
        ? this.draft.carryOverIds.filter((id) => id !== taskId)
        : [...this.draft.carryOverIds, taskId],
    });
  }

  plannerLaneLabel(lane: ReviewTask['item_json']['lane']): string {
    switch (lane) {
      case 'lesson':
        return 'Lessons';
      case 'podcast':
        return 'Podcast';
      case 'notes':
        return 'Notes';
      case 'admin':
      default:
        return 'Admin';
    }
  }

  plannerTaskEstimateLabel(task: ReviewTask): string {
    const actual = task.item_json.actual_min ?? 0;
    if (task.item_json.status === 'done' && actual > 0) {
      return `${actual} min actual`;
    }
    return `${task.item_json.estimate_min} min planned`;
  }

  plannerTaskContext(task: ReviewTask): string {
    const assignment = task.item_json.assignment;
    if (task.item_json.lane === 'lesson' && assignment.ar_lesson_id) {
      return `Lesson ${assignment.ar_lesson_id}`;
    }
    if (task.item_json.lane === 'podcast' && assignment.topic) {
      return assignment.topic;
    }
    if (task.related_node_title) {
      return task.related_node_title;
    }
    return task.task_type.replace(/[_-]+/g, ' ');
  }

  formatSavedAt(): string | null {
    const value = this.review?.updated_at || this.review?.created_at;
    if (!value) {
      return null;
    }

    try {
      return new Date(value).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return value;
    }
  }
}
