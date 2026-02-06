import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import {
  AppHeaderbarComponent,
  AppMenuCardsComponent,
  AppMenuCardSection,
  AppMenuCardItem,
} from '../../../../shared/components';

@Component({
  selector: 'app-grammar-menu',
  standalone: true,
  imports: [CommonModule, AppHeaderbarComponent, AppMenuCardsComponent],
  templateUrl: './grammar-menu.component.html',
  styleUrls: ['./grammar-menu.component.scss'],
})
export class GrammarMenuComponent {
  sections: AppMenuCardSection[] = [
    {
      id: 'grammar-core',
      title: 'Grammar Workspace',
      cards: [
        {
          id: 'chapters',
          title: 'Chapters & Lessons',
          description: 'Curate textbook chapters, lesson order, and linked grammar nodes.',
          route: ['/arabic/grammar/chapters'],
          image: 'assets/images/app-icons/dashboard/arabic-lesson-card.png',
          imageAlt: 'assets/images/app-icons/dashboard/lesson-card.svg',
          themeClass: 'theme-arabic',
        },
        {
          id: 'tree',
          title: 'Grammar Tree',
          description: 'Explore and edit the grammar concept hierarchy.',
          route: ['/arabic/grammar/tree'],
          image: 'assets/images/app-icons/dashboard/arabic-lexicon-card.png',
          imageAlt: 'assets/images/app-icons/dashboard/card-lexicon.svg',
          themeClass: 'theme-lexicon',
        },
        {
          id: 'examples',
          title: 'Examples Library',
          description: 'Collect Quranic and textbook examples tied to concepts.',
          route: ['/arabic/grammar/examples'],
          image: 'assets/images/app-icons/dashboard/arabic-root-card.png',
          imageAlt: 'assets/images/app-icons/dashboard/card-roots.svg',
          themeClass: 'theme-roots',
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
