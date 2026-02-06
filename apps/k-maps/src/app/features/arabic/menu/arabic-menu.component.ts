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
  selector: 'app-arabic-menu',
  standalone: true,
  imports: [CommonModule, AppHeaderbarComponent, AppMenuCardsComponent],
  templateUrl: './arabic-menu.component.html',
  styleUrls: ['./arabic-menu.component.scss'],
})
export class ArabicMenuComponent {
  sections: AppMenuCardSection[] = [
    {
      id: 'arabic-menu',
      title: 'Arabic Workspace',
      cards: [
        {
          id: 'quran',
          title: 'Quran',
          description: 'Quran lessons, data, and sections.',
          route: ['/arabic/quran'],
          image: 'assets/images/app-icons/dashboard/card-arabic.svg',
          imageAlt: 'assets/images/app-icons/dashboard/arabic-lesson-card.png',
          themeClass: 'theme-arabic',
        },
        {
          id: 'literature',
          title: 'Literature',
          description: 'Classical and modern Arabic texts.',
          route: ['/arabic/literature'],
          image: 'assets/images/app-icons/dashboard/card-lexicon.svg',
          imageAlt: 'assets/images/app-icons/dashboard/arabic-lexicon-card.png',
          themeClass: 'theme-lexicon',
        },
        {
          id: 'grammar',
          title: 'Grammar',
          description: 'Grammar tree, chapters, and examples.',
          route: ['/arabic/grammar'],
          image: 'assets/images/app-icons/dashboard/card-memory.svg',
          imageAlt: 'assets/images/app-icons/dashboard/arabic-memory-card.png',
          themeClass: 'theme-memory',
        },
        {
          id: 'tokens',
          title: 'Tokens',
          description: 'Canonical tokens & morphology.',
          route: ['/arabic/tokens'],
          image: 'assets/images/app-icons/dashboard/card-worldview.svg',
          imageAlt: 'assets/images/app-icons/dashboard/image.png',
          themeClass: 'theme-worldview',
        },
        {
          id: 'sentences',
          title: 'Sentences',
          description: 'Sentence occurrences and editors.',
          route: ['/arabic/sentences'],
          image: 'assets/images/app-icons/dashboard/card-crossref.svg',
          imageAlt: 'assets/images/app-icons/dashboard/icons.webp',
          themeClass: 'theme-crossref',
        },
        {
          id: 'roots',
          title: 'Roots',
          description: 'Root registry and cards.',
          route: ['/arabic/roots'],
          image: 'assets/images/app-icons/dashboard/card-roots.svg',
          imageAlt: 'assets/images/app-icons/dashboard/arabic-root-card.png',
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
