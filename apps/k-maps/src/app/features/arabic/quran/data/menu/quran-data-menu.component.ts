import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import {
  AppHeaderbarComponent,
  AppMenuCardsComponent,
  AppMenuCardSection,
  AppMenuCardItem,
} from '../../../../../shared/components';

@Component({
  selector: 'app-quran-data-menu',
  standalone: true,
  imports: [CommonModule, AppHeaderbarComponent, AppMenuCardsComponent],
  templateUrl: './quran-data-menu.component.html',
  styleUrls: ['./quran-data-menu.component.scss'],
})
export class QuranDataMenuComponent {
  sections: AppMenuCardSection[] = [
    {
      id: 'quran-data',
      title: 'Quran Data Workspace',
      cards: [
        {
          id: 'quran-text',
          title: 'Quran Text',
          description: 'Browse surahs and view ayah text cards.',
          route: ['/arabic/quran/data/text'],
          image: 'assets/images/app-icons/dashboard/card-arabic.svg',
          imageAlt: 'assets/images/app-icons/dashboard/arabic-lesson-card.png',
          themeClass: 'theme-arabic',
        },
        {
          id: 'lemmas',
          title: 'Lemma Index',
          description: 'Track lemma catalog, counts, and tokens.',
          route: ['/arabic/quran/data/lemmas'],
          image: 'assets/images/app-icons/dashboard/card-lexicon.svg',
          imageAlt: 'assets/images/app-icons/dashboard/arabic-lexicon-card.png',
          themeClass: 'theme-lexicon',
        },
        {
          id: 'lemma-locations',
          title: 'Lemma Locations',
          description: 'Inspect lemma positions by surah + ayah.',
          route: ['/arabic/quran/data/lemma-locations'],
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
