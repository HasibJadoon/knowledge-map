import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { StudyLessonResponse } from '../../../../../../../shared/services/quran/quran-surah.service';

@Component({
  selector: 'km-study-expressions-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './study-expressions-step.component.html',
  styleUrl: './study-expressions-step.component.scss',
})
export class StudyExpressionsStepComponent {
  @Input({ required: true }) lesson!: StudyLessonResponse;
}
