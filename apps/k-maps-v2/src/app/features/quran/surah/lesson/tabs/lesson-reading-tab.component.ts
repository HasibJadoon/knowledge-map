import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { StudyLessonResponse, AyahVm } from '../../../../../shared/services/surah-modules.service';

@Component({
  selector: 'km-lesson-reading-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="reading-tab">
      @if (readingTask()) {
        <div class="task-card">
          <span class="task-card__type">{{ readingTask()!.task_name ?? 'Reading Task' }}</span>
          @if (taskContent()) {
            <div class="task-card__body" [innerHTML]="taskContent()"></div>
          }
        </div>
      }

      <div class="ayahs">
        @for (ayah of lesson.ayahs; track ayah.ayah) {
          <div class="ayah-block">
            <div class="ayah-block__arabic">{{ ayah.text }}</div>
            @if (ayah.translation_sahih || ayah.translation_haleem) {
              <p class="ayah-block__trans">
                {{ ayah.translation_sahih ?? ayah.translation_haleem }}
              </p>
            }
            <span class="ayah-block__ref">{{ ayah.surah }}:{{ ayah.ayah }}</span>
          </div>
        }
      </div>

      @if (lesson.ayahs.length === 0) {
        <p class="empty">No ayahs found for this passage.</p>
      }
    </div>
  `,
  styles: [`
    .reading-tab { display: flex; flex-direction: column; gap: 1.5rem; }

    .task-card {
      background: var(--km-surface);
      border: 1px solid var(--km-border-gold);
      border-radius: 10px;
      padding: 1.1rem 1.25rem;
      display: flex; flex-direction: column; gap: 0.5rem;

      &__type {
        font-size: 0.68rem; letter-spacing: 0.1em; text-transform: uppercase;
        color: var(--km-gold); opacity: 0.75;
        font-family: var(--km-font-heading);
      }

      &__body {
        font-size: 0.875rem; color: var(--km-text-2); line-height: 1.65;
      }
    }

    .ayahs { display: flex; flex-direction: column; gap: 1.25rem; }

    .ayah-block {
      border-left: 2px solid var(--km-border-gold);
      padding: 0.75rem 0 0.75rem 1.25rem;
      display: flex; flex-direction: column; gap: 0.5rem;

      &__arabic {
        font-family: var(--km-font-heading);
        font-size: clamp(1.3rem, 3vw, 1.7rem);
        color: var(--km-text);
        direction: rtl; text-align: right; line-height: 1.9;
        letter-spacing: 0.02em;
      }

      &__trans {
        font-size: 0.875rem; color: var(--km-text-2);
        line-height: 1.65; margin: 0;
        font-style: italic;
      }

      &__ref {
        font-size: 0.68rem; color: var(--km-gold);
        font-family: var(--km-font-heading); opacity: 0.65;
        letter-spacing: 0.08em;
      }
    }

    .empty {
      color: var(--km-text-3); font-size: 0.875rem; text-align: center;
      padding: 2rem; font-style: italic;
    }
  `],
})
export class LessonReadingTabComponent {
  @Input({ required: true }) lesson!: StudyLessonResponse;

  readingTask() {
    return this.lesson.tasks.find(t => t.task_type === 'reading') ?? null;
  }

  taskContent(): string | null {
    const task = this.readingTask();
    if (!task?.task_json) return null;
    try {
      const parsed = JSON.parse(task.task_json);
      return parsed.content ?? parsed.text ?? null;
    } catch { return null; }
  }
}
