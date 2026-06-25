import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { StudyLessonResponse } from '../../../../../../shared/services/quran/quran-surah.service';
import { SentenceStructureMiroComponent }
  from '../../../study/detail/steps/sentence-structure/sentence-structure-miro.component';

// ─────────────────────────────────────────────────────────────────────────────
//  Lesson sentence-structure step — table-sourced + grounded.
//  Renders the modern Miro-style board over lesson.sentenceStructure. The legacy
//  D3 canvas / task_json tree path is obsolete and no longer used.
// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector:        'km-lesson-sentence-structure-step',
  standalone:      true,
  imports:         [SentenceStructureMiroComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (lesson.sentenceStructure?.sentences?.length) {
      <km-sentence-structure-miro
        [data]="lesson.sentenceStructure!"
        (openLexicon)="onOpenLexicon($event)" />
    } @else {
      <div class="ssm-empty"><p>No sentence-structure data for this passage yet.</p></div>
    }
  `,
})
export class LessonSentenceStructureStepComponent {
  @Input({ required: true }) lesson!: StudyLessonResponse;

  onOpenLexicon(_e: { root: string; word: string }): void {
    // Hook for the Five-Lens lexicon cross-reference (root → lexicon).
  }
}
