import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { StudyLessonResponse } from '../../../../../../../shared/services/quran/quran-surah.service';
import { SentenceStructureMiroComponent } from './sentence-structure-miro.component';

// ─────────────────────────────────────────────────────────────────────────────
//  Study sentence-structure step — table-sourced + grounded.
//  Renders the modern Miro-style board (km-sentence-structure-miro) over the
//  grounded payload (lesson.sentenceStructure). The legacy D3 canvas / task_json
//  tree path is obsolete and no longer used.
// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector:        'km-study-sentence-structure-step',
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
export class StudySentenceStructureStepComponent {
  @Input({ required: true }) lesson!: StudyLessonResponse;

  /** Hook for the Five-Lens lexicon cross-reference (root → lexicon). */
  onOpenLexicon(_e: { root: string; word: string }): void {
    // The lexicon modal is opened by the host study shell; left as an explicit
    // hook so the grounded word → root cross-ref can be wired without coupling
    // the board component to the lexicon service.
  }
}
