import { ChangeDetectionStrategy, Component, inject, Input } from '@angular/core';
import { Router } from '@angular/router';

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

  private readonly router = inject(Router);

  /** Five-Lens lexicon cross-reference: open the root in the lexicon book reader. */
  onOpenLexicon(e: { root: string; word: string }): void {
    if (!e.root) return;
    this.router.navigate(['/lexicon/books/lane_lexicon'], { queryParams: { root: e.root } });
  }
}
