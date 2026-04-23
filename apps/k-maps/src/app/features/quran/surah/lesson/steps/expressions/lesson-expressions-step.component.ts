import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { StudyLessonResponse } from '../../../../../../shared/services/quran/quran-surah.service';

@Component({
  selector: 'km-lesson-expressions-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lesson-expressions-step.component.html',
  styleUrl: './lesson-expressions-step.component.scss',
})
export class LessonExpressionsStepComponent {
  @Input({ required: true }) lesson!: StudyLessonResponse;
}
