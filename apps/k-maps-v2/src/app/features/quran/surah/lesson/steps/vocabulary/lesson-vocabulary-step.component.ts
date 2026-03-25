import { Component, Input, signal, ChangeDetectionStrategy } from '@angular/core';
import { StudyLessonResponse } from '../../../../../../shared/services/surah-modules.service';

@Component({
  selector: 'km-lesson-vocabulary-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lesson-vocabulary-step.component.html',
  styleUrl: './lesson-vocabulary-step.component.scss',
})
export class LessonVocabularyStepComponent {
  @Input({ required: true }) lesson!: StudyLessonResponse;
  showNouns = signal(true);

  hasVocabularySplit(): boolean {
    return this.lesson.vocabulary.nouns.length > 0 || this.lesson.vocabulary.verbs.length > 0;
  }

  splitPending(): boolean {
    return !this.hasVocabularySplit() && !!this.lesson.unit?.text_cache?.trim();
  }
}
