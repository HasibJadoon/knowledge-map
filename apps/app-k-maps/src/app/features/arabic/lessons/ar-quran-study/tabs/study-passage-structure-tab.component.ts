import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { buildTaskTargetSafe } from '../../../../../shared/utils/content/targeting-builders';
import { TargetRef } from '../../../../../shared/models/content/targeting.models';

import {
  PassageAccent,
  PassageRenderer,
  PassageSectionCard,
  PassageTextSegment,
} from '../ar-quran-study.facade';

@Component({
  selector: 'app-study-passage-structure-tab',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './study-passage-structure-tab.component.html',
})
export class StudyPassageStructureTabComponent implements OnChanges {
  @Input() headerTitle = '';
  @Input() headerSubtitle = '';
  @Input() sections: PassageSectionCard[] = [];
  @Input() unitId = '';
  @Input() rangeRef = '';

  @Input() toSegments: (value: string) => PassageTextSegment[] = () => [];
  @Input() resolveIcon: (iconName: string, renderer: PassageRenderer, accent: PassageAccent) => string = () => '';

  taskTarget: TargetRef | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['unitId'] || changes['rangeRef']) {
      this.taskTarget = this.buildTaskTarget();
    }
  }

  private buildTaskTarget(): TargetRef | null {
    return buildTaskTargetSafe(this.unitId, 'passage_structure', this.rangeRef);
  }
}
