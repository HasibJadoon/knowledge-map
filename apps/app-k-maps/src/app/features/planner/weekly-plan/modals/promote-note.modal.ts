import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { CaptureNote, PromotionRequest } from '../../../../shared/sprint/models/sprint.models';

@Component({
  selector: 'app-promote-note-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './promote-note.modal.html',
  styleUrl: './promote-note.modal.scss',
})
export class PromoteNoteModalComponent {
  private readonly modalController = inject(ModalController);

  @Input({ required: true }) note!: CaptureNote;

  noteType = 'reflection';
  targetType = '';
  targetId = '';
  ayahRef = '';
  unitId = '';

  readonly noteTypes = ['lesson_note', 'podcast_note', 'grammar', 'morphology', 'reflection', 'idea'];

  cancel(): void {
    void this.modalController.dismiss(null, 'cancel');
  }

  submit(): void {
    const payload: PromotionRequest = {
      note_type: this.noteType,
    };

    const targetType = this.targetType.trim();
    const targetId = this.targetId.trim();
    if (targetType && targetId) {
      payload.targets = [
        {
          target_type: targetType,
          target_id: targetId,
          unit_id: this.unitId.trim() || undefined,
          ref: this.ayahRef.trim() || undefined,
        },
      ];
    }

    void this.modalController.dismiss(payload, 'promote');
  }
}
