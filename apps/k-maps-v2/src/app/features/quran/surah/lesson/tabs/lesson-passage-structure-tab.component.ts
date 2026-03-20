import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { StudyLessonResponse, UnitTaskVm } from '../../../../../shared/services/surah-modules.service';

@Component({
  selector: 'km-lesson-passage-structure-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ps-tab">
      @if (task()) {
        <div class="task-header">
          <span class="task-type">Passage Structure</span>
          @if (task()!.task_name) {
            <h2 class="task-name">{{ task()!.task_name }}</h2>
          }
        </div>

        @if (sections().length > 0) {
          <div class="section-list">
            @for (section of sections(); track $index) {
              <div class="section-card">
                @if (section.label || section.title) {
                  <h3 class="section-card__title">{{ section.label ?? section.title }}</h3>
                }
                @if (section.ayahs) {
                  <span class="section-card__range">Ayahs: {{ section.ayahs }}</span>
                }
                @if (section.description || section.content || section.text) {
                  <p class="section-card__desc">
                    {{ section.description ?? section.content ?? section.text }}
                  </p>
                }
              </div>
            }
          </div>
        } @else if (content()) {
          <div class="task-body" [innerHTML]="content()"></div>
        } @else if (task()!.task_json) {
          <pre class="task-raw">{{ prettyJson() }}</pre>
        } @else {
          <p class="empty">No content available for this task.</p>
        }
      } @else {
        <div class="no-task">
          <span class="no-task__icon">—</span>
          <p>No passage structure task for this passage.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .ps-tab { display: flex; flex-direction: column; gap: 1.25rem; }

    .task-header { display: flex; flex-direction: column; gap: 0.4rem; }

    .task-type {
      font-size: 0.68rem; letter-spacing: 0.1em; text-transform: uppercase;
      color: var(--km-gold); opacity: 0.7; font-family: var(--km-font-heading);
    }

    .task-name {
      font-size: 1.05rem; font-weight: 500; color: var(--km-text);
      margin: 0; letter-spacing: 0.02em;
    }

    .section-list { display: flex; flex-direction: column; gap: 0.75rem; }

    .section-card {
      background: var(--km-surface);
      border: 1px solid var(--km-border);
      border-left: 3px solid var(--km-border-gold);
      border-radius: 0 10px 10px 0;
      padding: 0.85rem 1.1rem;
      display: flex; flex-direction: column; gap: 0.35rem;

      &__title {
        font-size: 0.9rem; font-weight: 600; color: var(--km-text);
        margin: 0; letter-spacing: 0.02em;
      }

      &__range {
        font-size: 0.68rem; color: var(--km-gold);
        font-family: var(--km-font-heading); opacity: 0.7;
        letter-spacing: 0.06em;
      }

      &__desc {
        font-size: 0.85rem; color: var(--km-text-2); line-height: 1.6;
        margin: 0;
      }
    }

    .task-body {
      font-size: 0.9rem; color: var(--km-text-2); line-height: 1.7;
      p { margin: 0 0 0.75rem; }
    }

    .task-raw {
      background: var(--km-surface); border: 1px solid var(--km-border);
      border-radius: 8px; padding: 1rem;
      font-size: 0.78rem; color: var(--km-text-3);
      overflow-x: auto; white-space: pre-wrap; word-break: break-word;
    }

    .no-task {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 4rem 1rem; gap: 0.75rem;
      color: var(--km-text-3); text-align: center;

      &__icon { font-size: 2rem; opacity: 0.25; }
      p { font-size: 0.875rem; font-style: italic; }
    }

    .empty { color: var(--km-text-3); font-size: 0.875rem; font-style: italic; }
  `],
})
export class LessonPassageStructureTabComponent {
  @Input({ required: true }) lesson!: StudyLessonResponse;

  task(): UnitTaskVm | null {
    return this.lesson.tasks.find(t => t.task_type === 'passage_structure') ?? null;
  }

  sections(): any[] {
    const t = this.task();
    if (!t?.task_json) return [];
    try {
      const parsed = JSON.parse(t.task_json);
      return Array.isArray(parsed.sections) ? parsed.sections
           : Array.isArray(parsed) ? parsed
           : [];
    } catch { return []; }
  }

  content(): string | null {
    const t = this.task();
    if (!t?.task_json) return null;
    try {
      const parsed = JSON.parse(t.task_json);
      return parsed.content ?? parsed.text ?? parsed.html ?? null;
    } catch { return null; }
  }

  prettyJson(): string {
    const t = this.task();
    if (!t?.task_json) return '';
    try { return JSON.stringify(JSON.parse(t.task_json), null, 2); }
    catch { return t.task_json; }
  }
}
