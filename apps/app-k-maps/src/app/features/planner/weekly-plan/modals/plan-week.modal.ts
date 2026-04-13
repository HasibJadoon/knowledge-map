import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { PlannerTaskRow, PlannerWeekPlan } from '../../../../shared/sprint/models/sprint.models';
import { LessonsService } from '../../../../shared/sprint/services/lessons.service';

export type PlanWeekModalResult =
  | {
      mode: 'save';
      assignments: Record<string, unknown>;
    }
  | {
      mode: 'later';
    };

type PlanWeekDraft = {
  lesson_1: { ar_lesson_id: number | null; unit_id: string | null };
  lesson_2: { ar_lesson_id: number | null; unit_id: string | null };
  podcast_1: { topic: string; episode_no: number | null; recording_at: string | null };
  podcast_2: { topic: string; episode_no: number | null; recording_at: string | null };
  podcast_3: { topic: string; episode_no: number | null; recording_at: string | null };
};

@Component({
  selector: 'app-plan-week-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './plan-week.modal.html',
  styleUrl: './plan-week.modal.scss',
})
export class PlanWeekModalComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly lessonsService = inject(LessonsService);

  @Input({ required: true }) weekStart = '';
  @Input() weekPlan: PlannerWeekPlan | null = null;
  @Input() tasks: PlannerTaskRow[] = [];

  readonly loading = signal(false);
  readonly lessons = signal<Array<{ id: number; title: string }>>([]);

  draft: PlanWeekDraft = {
    lesson_1: { ar_lesson_id: null, unit_id: null },
    lesson_2: { ar_lesson_id: null, unit_id: null },
    podcast_1: { topic: '', episode_no: 1, recording_at: null },
    podcast_2: { topic: '', episode_no: 2, recording_at: null },
    podcast_3: { topic: '', episode_no: 3, recording_at: null },
  };

  async ngOnInit(): Promise<void> {
    this.seedFromTasks();
    await this.loadLessons();
  }

  cancelLater(): void {
    void this.modalController.dismiss({ mode: 'later' } satisfies PlanWeekModalResult, 'later');
  }

  savePlan(): void {
    const lesson1 = toNullableInt(this.draft.lesson_1.ar_lesson_id);
    const lesson2 = toNullableInt(this.draft.lesson_2.ar_lesson_id);
    void this.modalController.dismiss(
      {
        mode: 'save',
        assignments: {
          lesson_1: {
            ...this.draft.lesson_1,
            ar_lesson_id: lesson1,
          },
          lesson_2: {
            ...this.draft.lesson_2,
            ar_lesson_id: lesson2,
          },
          podcast_1: this.draft.podcast_1,
          podcast_2: this.draft.podcast_2,
          podcast_3: this.draft.podcast_3,
        },
      } satisfies PlanWeekModalResult,
      'save'
    );
  }

  private seedFromTasks(): void {
    for (const task of this.tasks) {
      const key = task.item_json.meta.anchor_key;
      if (!key) {
        continue;
      }

      if (key === 'lesson_1' || key === 'lesson_2') {
        this.draft[key] = {
          ar_lesson_id: task.item_json.assignment.ar_lesson_id,
          unit_id: task.item_json.assignment.unit_id,
        };
        continue;
      }

      this.draft[key] = {
        topic: task.item_json.assignment.topic ?? this.draft[key].topic,
        episode_no: task.item_json.assignment.episode_no ?? this.draft[key].episode_no,
        recording_at: task.item_json.assignment.recording_at,
      };
    }
  }

  private async loadLessons(): Promise<void> {
    this.loading.set(true);
    try {
      const rows = await firstValueFrom(this.lessonsService.list('', 80));
      this.lessons.set(rows.map((row) => ({ id: row.id, title: row.title })));
    } catch {
      this.lessons.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}

function toNullableInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }
  return null;
}
