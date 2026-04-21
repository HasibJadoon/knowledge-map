import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { TargetRef } from '../../shared/models/content/targeting.models';
import { TargetedNotesBlockComponent } from './targeted-notes-block/targeted-notes-block.component';

@Component({
  selector: 'app-targeted-notes-modal',
  standalone: true,
  imports: [CommonModule, IonicModule, TargetedNotesBlockComponent],
  templateUrl: './targeted-notes.modal.html',
  styleUrl: './targeted-notes.modal.scss',
})
export class TargetedNotesModalComponent {
  private readonly arabicScriptRe = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

  @Input({ required: true }) target!: TargetRef;
  @Input() title = 'Notes';
  @Input() subtitle = '';
  @Input() placeholder = 'Add a targeted note...';
  @Input() contextText = '';
  @Input() contextTextLabel = '';
  @Input() contextFocus = '';

  private readonly modalController = inject(ModalController);

  dismiss(): void {
    void this.modalController.dismiss(null, 'close');
  }

  get targetLabel(): string {
    switch (this.target?.target_type) {
      case 'quran_word':
        return 'Word Target';
      case 'quran_ayah':
        return 'Verse Target';
      case 'task_item':
        return 'Task Item';
      case 'task':
        return 'Task';
      default:
        return 'Targeted Notes';
    }
  }

  get targetRef(): string {
    return this.target?.ref?.trim() || this.target?.target_id || '';
  }

  get hasContextText(): boolean {
    return this.contextText.trim().length > 0;
  }

  get isContextArabic(): boolean {
    return this.arabicScriptRe.test(this.contextText);
  }
}
