import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import {
  CardBodyComponent,
  CardComponent,
  ColComponent,
  RowComponent,
} from '@coreui/angular';

export interface AppMenuCardItem {
  id: string;
  title: string;
  description: string;
  route?: string | any[];
  image: string;
  imageAlt?: string;
  themeClass?: string;
  disabled?: boolean;
}

export interface AppMenuCardSection {
  id: string;
  title: string;
  cards: AppMenuCardItem[];
}

@Component({
  selector: 'app-menu-cards',
  standalone: true,
  imports: [CommonModule, CardComponent, CardBodyComponent, RowComponent, ColComponent],
  templateUrl: './app-menu-cards.component.html',
  styleUrls: ['./app-menu-cards.component.scss'],
})
export class AppMenuCardsComponent {
  @Input() sections: AppMenuCardSection[] = [];
  @Output() cardSelect = new EventEmitter<AppMenuCardItem>();

  trackBySection = (_index: number, section: AppMenuCardSection) => section.id;
  trackByCard = (_index: number, card: AppMenuCardItem) => card.id;

  onCardSelect(card: AppMenuCardItem) {
    if (card.disabled) return;
    this.cardSelect.emit(card);
  }

  onCardKeydown(card: AppMenuCardItem, event: KeyboardEvent) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.onCardSelect(card);
  }
}
