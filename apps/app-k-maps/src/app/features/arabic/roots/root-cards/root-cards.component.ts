import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';

export type RootCard = {
  front?: string;
  back?: string;
  tag?: string;
};

@Component({
  selector: 'app-root-cards',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './root-cards.component.html',
  styleUrls: ['./root-cards.component.scss'],
})
export class RootCardsComponent {
  @Input() root = '';
  @Input() cards: RootCard[] = [];

  private readonly modalCtrl = inject(ModalController);

  close(): void {
    this.modalCtrl.dismiss();
  }
}
