import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { TargetRef } from './targeting.models';
import { TargetedNotesBlockComponent } from './targeted-notes-block/targeted-notes-block.component';

@Component({
  selector: 'app-targeted-notes-modal',
  standalone: true,
  imports: [CommonModule, IonicModule, TargetedNotesBlockComponent],
  templateUrl: './targeted-notes.modal.html',
  styleUrl: './targeted-notes.modal.scss',
})
export class TargetedNotesModalComponent {
  @Input({ required: true }) target!: TargetRef;
  @Input() title = 'Notes';
  @Input() subtitle = '';
  @Input() placeholder = 'Add a targeted note...';

  private readonly modalController = inject(ModalController);

  dismiss(): void {
    void this.modalController.dismiss(null, 'close');
  }
}
