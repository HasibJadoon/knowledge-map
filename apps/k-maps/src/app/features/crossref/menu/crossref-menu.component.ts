import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import {
  AppHeaderbarComponent,
  AppMenuCardsComponent,
  AppMenuCardSection,
  AppMenuCardItem,
} from '../../../shared/components';

@Component({
  selector: 'app-crossref-menu',
  standalone: true,
  imports: [CommonModule, AppHeaderbarComponent, AppMenuCardsComponent],
  templateUrl: './crossref-menu.component.html',
  styleUrls: ['./crossref-menu.component.scss'],
})
export class CrossrefMenuComponent {
  sections: AppMenuCardSection[] = [
    {
      id: 'crossref-menu',
      title: 'Cross-Reference Suite',
      cards: [
        {
          id: 'crossref-list',
          title: 'Cross References',
          description: 'Browse and manage all references.',
          route: ['/crossref/refs'],
          image: 'assets/images/app-icons/dashboard/card-crossref.svg',
          imageAlt: 'assets/images/app-icons/dashboard/icons.webp',
          themeClass: 'theme-crossref',
        },
        {
          id: 'crossref-new',
          title: 'New Cross Reference',
          description: 'Create a new Quran-linked reference.',
          route: ['/crossref/new'],
          image: 'assets/images/app-icons/dashboard/card-arabic.svg',
          imageAlt: 'assets/images/app-icons/dashboard/arabic-lesson-card.png',
          themeClass: 'theme-arabic',
        },
      ],
    },
  ];

  constructor(private router: Router) {}

  onCardSelect(card: AppMenuCardItem) {
    if (!card.route) return;
    const route = Array.isArray(card.route) ? card.route : [card.route];
    this.router.navigate(route);
  }
}
