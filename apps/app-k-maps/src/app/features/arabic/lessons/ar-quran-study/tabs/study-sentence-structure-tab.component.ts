import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TargetedNotesModalService } from '../../../../../shared/targeting/targeted-notes-modal.service';
import { buildTaskItemTargetSafe, buildTaskTargetSafe } from '../../../../../shared/targeting/targeting-builders';
import { TargetRef } from '../../../../../shared/targeting/targeting.models';

import { StudySentenceEntry } from '../ar-quran-study.facade';

@Component({
  selector: 'app-study-sentence-structure-tab',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './study-sentence-structure-tab.component.html',
})
export class StudySentenceStructureTabComponent implements OnChanges {
  private readonly targetedNotesModal = inject(TargetedNotesModalService);

  @Input() entries: StudySentenceEntry[] = [];
  @Input() unitId = '';
  @Input() rangeRef = '';

  taskTarget: TargetRef | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['unitId'] || changes['rangeRef']) {
      this.taskTarget = this.buildTaskTarget();
    }
  }

  async openSentenceNotes(event: Event, sentence: StudySentenceEntry): Promise<void> {
    event.stopPropagation();

    const target = this.buildSentenceItemTarget(sentence) ?? this.taskTarget;
    if (!target) return;
    const order = sentence.order > 0 ? sentence.order : 1;

    await this.targetedNotesModal.open({
      target,
      title: 'Sentence Notes',
      subtitle: `Sentence #${order}`,
      placeholder: 'Add a note for this sentence...',
    });
  }

  private buildTaskTarget(): TargetRef | null {
    return buildTaskTargetSafe(this.unitId, 'sentence_structure', this.rangeRef);
  }

  private buildSentenceItemTarget(sentence: StudySentenceEntry): TargetRef | null {
    const order = sentence.order > 0 ? sentence.order : 1;
    const itemKey = `sent_${order}`;
    return buildTaskItemTargetSafe(
      this.unitId,
      'sentence_structure',
      itemKey,
      `Sentence #${order}`,
      this.rangeRef
    );
  }
}
