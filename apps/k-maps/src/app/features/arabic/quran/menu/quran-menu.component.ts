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
  selector: 'app-quran-menu',
  standalone: true,
  imports: [CommonModule, AppHeaderbarComponent, AppMenuCardsComponent],
  templateUrl: './quran-menu.component.html',
  styleUrls: ['./quran-menu.component.scss'],
})
export class QuranMenuComponent {
  sections: AppMenuCardSection[] = [
    {
      id: 'quran-menu',
      title: 'Quran Workspace',
      cards: [
        {
          id: 'quran-lessons',
          title: 'Quran Lessons',
          description: 'Verse-based lesson builder and drafts.',
          route: ['/arabic/quran/lessons'],
          image: 'assets/images/app-icons/dashboard/card-arabic.svg',
          imageAlt: 'assets/images/app-icons/dashboard/arabic-lesson-card.png',
          themeClass: 'theme-arabic',
        },
        {
          id: 'quran-data',
          title: 'Quran Data',
          description: 'Manage surah text, lemmas, and lemma locations.',
          route: ['/arabic/quran/data'],
          image: 'assets/images/app-icons/dashboard/card-lexicon.svg',
          imageAlt: 'assets/images/app-icons/dashboard/arabic-lexicon-card.png',
          themeClass: 'theme-lexicon',
        },
        {
          id: 'quran-sections',
          title: 'Quran Sections',
          description: 'Study sections, views, and lessons by passage.',
          route: ['/arabic/quran/lessons/sections'],
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
