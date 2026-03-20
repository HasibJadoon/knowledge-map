import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { StudyLessonResponse, StudyExpressionVm } from '../../../../../shared/services/surah-modules.service';

@Component({
  selector: 'km-lesson-expressions-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="expr-tab">
      @if (lesson.expressions.length === 0) {
        <div class="no-content">
          <span class="no-content__icon">—</span>
          <p>No expressions found for this passage.</p>
        </div>
      } @else {
        <p class="count">{{ lesson.expressions.length }} expression{{ lesson.expressions.length !== 1 ? 's' : '' }}</p>

        <div class="expr-list">
          @for (expr of lesson.expressions; track expr.expression_id) {
            <div class="expr-card">
              <div class="expr-card__top">
                @if (expr.expression_text || expr.text) {
                  <span class="expr-card__ar">{{ expr.expression_text ?? expr.text }}</span>
                }
                @if (expr.label) {
                  <span class="expr-card__label">{{ expr.label }}</span>
                }
              </div>

              @if (expr.expression_meaning || expr.meaning || expr.gloss) {
                <p class="expr-card__meaning">
                  {{ expr.expression_meaning ?? expr.meaning ?? expr.gloss }}
                </p>
              }

              @if (expr.expression_type) {
                <span class="expr-card__type">{{ expr.expression_type }}</span>
              }

              <span class="expr-card__ref">{{ lesson.surahId }}:{{ expr.ayah }}</span>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .expr-tab { display: flex; flex-direction: column; gap: 1rem; }

    .count {
      font-size: 0.72rem; color: var(--km-text-3);
      letter-spacing: 0.08em; text-transform: uppercase;
      margin: 0;
    }

    .expr-list { display: flex; flex-direction: column; gap: 0.85rem; }

    .expr-card {
      background: var(--km-surface);
      border: 1px solid var(--km-border);
      border-radius: 10px;
      padding: 0.9rem 1.1rem;
      display: flex; flex-direction: column; gap: 0.4rem;
      transition: border-color 0.2s;

      &:hover { border-color: var(--km-border-gold); }

      &__top {
        display: flex; align-items: baseline;
        gap: 1rem; flex-wrap: wrap;
        justify-content: space-between;
      }

      &__ar {
        font-family: var(--km-font-heading);
        font-size: 1.3rem; color: var(--km-text);
        direction: rtl;
      }

      &__label {
        font-size: 0.8rem; color: var(--km-text-2);
        font-weight: 500;
      }

      &__meaning {
        font-size: 0.875rem; color: var(--km-text-2);
        font-style: italic; line-height: 1.55; margin: 0;
      }

      &__type {
        font-size: 0.65rem; letter-spacing: 0.08em; text-transform: uppercase;
        color: var(--km-gold); opacity: 0.65;
        font-family: var(--km-font-heading);
      }

      &__ref {
        font-size: 0.62rem; color: var(--km-gold);
        font-family: var(--km-font-heading); opacity: 0.55;
        margin-top: 0.1rem;
      }
    }

    .no-content {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 4rem 1rem; gap: 0.75rem;
      color: var(--km-text-3); text-align: center;

      &__icon { font-size: 2rem; opacity: 0.25; }
      p { font-size: 0.875rem; font-style: italic; }
    }
  `],
})
export class LessonExpressionsTabComponent {
  @Input({ required: true }) lesson!: StudyLessonResponse;
}
