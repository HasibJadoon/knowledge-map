import { Injectable, inject } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TargetedNotesModalComponent } from './targeted-notes.modal';
import { TargetRef } from './targeting.models';

export type OpenTargetedNotesModalArgs = {
  target: TargetRef;
  title?: string;
  subtitle?: string;
  placeholder?: string;
  contextText?: string;
  contextTextLabel?: string;
  contextFocus?: string;
  cssClass?: string;
};

@Injectable({ providedIn: 'root' })
export class TargetedNotesModalService {
  private readonly modalController = inject(ModalController);

  async open(args: OpenTargetedNotesModalArgs): Promise<void> {
    const cssClass = ['targeted-notes-modal-shell', args.cssClass].filter(Boolean).join(' ');
    const modal = await this.modalController.create({
      component: TargetedNotesModalComponent,
      cssClass,
      componentProps: {
        target: args.target,
        title: args.title ?? 'Notes',
        subtitle: args.subtitle ?? '',
        placeholder: args.placeholder ?? 'Add a targeted note...',
        contextText: args.contextText ?? '',
        contextTextLabel: args.contextTextLabel ?? '',
        contextFocus: args.contextFocus ?? '',
      },
    });

    await modal.present();
  }
}
