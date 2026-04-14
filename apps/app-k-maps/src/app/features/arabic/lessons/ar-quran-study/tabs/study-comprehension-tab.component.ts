import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TargetedNotesModalService } from '../../../../../shared/targeting/targeted-notes-modal.service';
import { buildTaskItemTargetSafe, buildTaskTargetSafe } from '../../../../../shared/targeting/targeting-builders';
import { TargetRef } from '../../../../../shared/targeting/targeting.models';

import { ComprehensionQuestionGroup } from '../ar-quran-study.facade';

@Component({
  selector: 'app-study-comprehension-tab',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './study-comprehension-tab.component.html',
})
export class StudyComprehensionTabComponent implements OnChanges {
  private readonly targetedNotesModal = inject(TargetedNotesModalService);

  @Input() total = 0;
  @Input() groups: ComprehensionQuestionGroup[] = [];
  @Input() unitId = '';
  @Input() rangeRef = '';

  taskTarget: TargetRef | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['unitId'] || changes['rangeRef']) {
      this.taskTarget = this.buildTaskTarget();
    }
  }

  async openQuestionNotes(
    event: Event,
    group: ComprehensionQuestionGroup,
    groupIndex: number,
    questionIndex: number
  ): Promise<void> {
    event.stopPropagation();

    const ordinal = this.questionOrdinal(groupIndex, questionIndex);
    const target = this.buildQuestionTarget(ordinal) ?? this.taskTarget;
    if (!target) return;

    await this.targetedNotesModal.open({
      target,
      title: 'Question Notes',
      subtitle: `${group.title} • Q#${ordinal}`,
      placeholder: 'Add a note for this question...',
    });
  }

  private buildTaskTarget(): TargetRef | null {
    return buildTaskTargetSafe(this.unitId, 'comprehension', this.rangeRef);
  }

  private buildQuestionTarget(questionOrdinal: number): TargetRef | null {
    const itemKey = `q_${questionOrdinal}`;
    return buildTaskItemTargetSafe(
      this.unitId,
      'comprehension',
      itemKey,
      `Q#${questionOrdinal}`,
      this.rangeRef
    );
  }

  private questionOrdinal(groupIndex: number, questionIndex: number): number {
    let offset = 0;
    for (let index = 0; index < groupIndex; index += 1) {
      offset += this.groups[index]?.questions?.length ?? 0;
    }
    return offset + questionIndex + 1;
  }
}
