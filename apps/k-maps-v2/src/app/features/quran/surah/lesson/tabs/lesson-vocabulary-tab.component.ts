import { Component, Input, signal, ChangeDetectionStrategy } from '@angular/core';
import { StudyLessonResponse, StudyWordVm } from '../../../../../shared/services/surah-modules.service';

@Component({
  selector: 'km-lesson-vocabulary-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="vocab-tab">

      @if (hasVocabularySplit()) {
        <div class="vocab-toggle">
          <button class="toggle-btn" [class.toggle-btn--active]="showNouns()" (click)="showNouns.set(true)">
            Nouns <span class="badge">{{ lesson.vocabulary.nouns.length }}</span>
          </button>
          <button class="toggle-btn" [class.toggle-btn--active]="!showNouns()" (click)="showNouns.set(false)">
            Verbs <span class="badge">{{ lesson.vocabulary.verbs.length }}</span>
          </button>
        </div>
      } @else if (splitPending()) {
        <div class="vocab-status">
          Vocabulary split is still pending from the study API for this passage.
        </div>
      } @else {
        <div class="vocab-status">
          No vocabulary data is available for this passage.
        </div>
      }

      @if (hasVocabularySplit() && showNouns()) {
        <div class="word-grid">
          @for (word of lesson.vocabulary.nouns; track word.word_id) {
            <div class="word-card">
              <span class="word-card__ar">{{ word.word }}</span>
              @if (word.translation) {
                <span class="word-card__trans">{{ word.translation }}</span>
              }
              @if (word.root) {
                <span class="word-card__root">Root: {{ word.root }}</span>
              }
              @if (word.gloss) {
                <span class="word-card__gloss">{{ word.gloss }}</span>
              }
              <span class="word-card__ref">{{ lesson.surahId }}:{{ word.ayah }}</span>
            </div>
          }
          @if (lesson.vocabulary.nouns.length === 0) {
            <p class="empty">No nouns found for this passage.</p>
          }
        </div>
      } @else if (hasVocabularySplit()) {
        <div class="word-grid">
          @for (word of lesson.vocabulary.verbs; track word.word_id) {
            <div class="word-card word-card--verb">
              <span class="word-card__ar">{{ word.word }}</span>
              @if (word.translation) {
                <span class="word-card__trans">{{ word.translation }}</span>
              }
              @if (word.root) {
                <span class="word-card__root">Root: {{ word.root }}</span>
              }
              @if (word.morphology?.verb_form) {
                <span class="word-card__morph">{{ word.morphology!.verb_form }}</span>
              }
              <span class="word-card__ref">{{ lesson.surahId }}:{{ word.ayah }}</span>
            </div>
          }
          @if (lesson.vocabulary.verbs.length === 0) {
            <p class="empty">No verbs found for this passage.</p>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .vocab-tab { display: flex; flex-direction: column; gap: 1.25rem; }

    .vocab-toggle {
      display: flex; gap: 0.5rem;
    }

    .vocab-status {
      padding: 0.85rem 1rem;
      border-radius: 10px;
      border: 1px solid rgba(201,168,76,0.2);
      background: rgba(201,168,76,0.06);
      color: var(--km-text-2);
      font-size: 0.82rem;
      line-height: 1.6;
    }

    .toggle-btn {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.45rem 1rem; border-radius: 8px;
      background: rgba(255,255,255,0.03);
      border: 1px solid var(--km-border);
      color: var(--km-text-3); cursor: pointer;
      font-family: var(--km-font-body); font-size: 0.8rem;
      letter-spacing: 0.05em;
      transition: border-color 0.2s, color 0.2s, background 0.2s;

      &--active {
        border-color: var(--km-border-gold);
        color: var(--km-gold);
        background: rgba(201,168,76,0.07);
      }
    }

    .badge {
      font-size: 0.65rem; padding: 0.1rem 0.4rem;
      background: rgba(255,255,255,0.06); border-radius: 10px;
      color: var(--km-text-3);
    }
    .toggle-btn--active .badge { color: var(--km-gold); }

    .word-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 0.75rem;
    }

    .word-card {
      background: var(--km-surface);
      border: 1px solid var(--km-border);
      border-radius: 10px;
      padding: 0.85rem 0.9rem;
      display: flex; flex-direction: column; gap: 0.3rem;
      transition: border-color 0.2s;

      &:hover { border-color: rgba(107, 186, 255, 0.4); }
      &--verb:hover { border-color: rgba(77, 217, 168, 0.4); }

      &__ar {
        font-family: var(--km-font-arabic, 'Scheherazade New', serif);
        font-size: 1.5rem; color: var(--km-text);
        direction: rtl; text-align: right;
        line-height: 1.6;
      }

      &__trans {
        font-size: 0.8rem; color: var(--km-text-2); font-style: italic;
      }

      &__root {
        font-size: 0.68rem; color: #6bbaf0;
        letter-spacing: 0.04em;
      }

      &__gloss, &__morph {
        font-size: 0.68rem; color: var(--km-text-3); letter-spacing: 0.03em;
      }

      &__ref {
        font-size: 0.62rem; color: var(--km-gold);
        font-family: var(--km-font-heading); opacity: 0.6;
        margin-top: auto;
      }
    }

    .empty {
      color: var(--km-text-3); font-size: 0.875rem; text-align: center;
      padding: 2rem; font-style: italic; grid-column: 1 / -1;
    }
  `],
})
export class LessonVocabularyTabComponent {
  @Input({ required: true }) lesson!: StudyLessonResponse;
  showNouns = signal(true);

  hasVocabularySplit(): boolean {
    return this.lesson.vocabulary.nouns.length > 0 || this.lesson.vocabulary.verbs.length > 0;
  }

  splitPending(): boolean {
    return !this.hasVocabularySplit() && !!this.lesson.unit?.text_cache?.trim();
  }
}
