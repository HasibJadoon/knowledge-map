import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import {
  AppMenuCardItem,
  AppMenuCardSection,
  AppMenuCardsComponent,
} from '../../shared/components';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  imports: [CommonModule, AppMenuCardsComponent],
})
export class DashboardComponent {
  readonly sections: AppMenuCardSection[] = [
    {
      id: 'arabic',
      title: 'Arabic',
      cards: [
        {
          id: 'quran-lessons',
          title: 'Quran Lessons',
          description: 'Verse-based lesson builder',
          route: '/arabic/quran/lessons',
          image: '/assets/images/app-icons/dashboard/card-arabic.svg',
          imageAlt: '/assets/images/app-icons/dashboard/arabic-lesson-card.png',
          themeClass: 'theme-arabic',
        },
        {
          id: 'quran-data',
          title: 'Quran Data',
          description: 'Surahs, ayahs, lemmas, locations',
          route: '/arabic/quran/data',
          image: '/assets/images/app-icons/dashboard/card-lexicon.svg',
          imageAlt: '/assets/images/app-icons/dashboard/arabic-lexicon-card.png',
          themeClass: 'theme-lexicon',
        },
        {
          id: 'literature-lessons',
          title: 'Literature Lessons',
          description: 'Non-Quran lesson workflows',
          route: '/arabic/literature/lessons',
          image: '/assets/images/app-icons/dashboard/card-lexicon.svg',
          imageAlt: '/assets/images/app-icons/dashboard/arabic-lexicon-card.png',
          themeClass: 'theme-lexicon',
        },
        {
          id: 'grammar',
          title: 'Grammar',
          description: 'Concepts + links',
          route: '/arabic/grammar',
          image: '/assets/images/app-icons/dashboard/card-memory.svg',
          imageAlt: '/assets/images/app-icons/dashboard/arabic-memory-card.png',
          themeClass: 'theme-memory',
        },
        {
          id: 'tokens',
          title: 'Tokens',
          description: 'Canonical token registry',
          route: '/arabic/tokens',
          image: '/assets/images/app-icons/dashboard/card-worldview.svg',
          imageAlt: '/assets/images/app-icons/dashboard/image.png',
          themeClass: 'theme-worldview',
        },
        {
          id: 'sentences',
          title: 'Sentences',
          description: 'Sentence occurrences',
          route: '/arabic/sentences',
          image: '/assets/images/app-icons/dashboard/card-crossref.svg',
          imageAlt: '/assets/images/app-icons/dashboard/icons.webp',
          themeClass: 'theme-crossref',
        },
        {
          id: 'roots',
          title: 'Roots',
          description: 'Quranic roots + cards',
          route: '/arabic/roots',
          image: '/assets/images/app-icons/dashboard/card-roots.svg',
          imageAlt: '/assets/images/app-icons/dashboard/arabic-root-card.png',
          themeClass: 'theme-roots',
        },
      ],
    },
    {
      id: 'worldview',
      title: 'Worldview',
      cards: [
        {
          id: 'worldview-lessons',
          title: 'Worldview Lessons',
          description: 'Lessons + sources',
          route: '/worldview',
          image: '/assets/images/app-icons/dashboard/card-worldview.svg',
          imageAlt: '/assets/images/app-icons/dashboard/image.png',
          themeClass: 'theme-worldview',
        },
      ],
    },
    {
      id: 'crossref',
      title: 'Cross-Reference',
      cards: [
        {
          id: 'cross-references',
          title: 'Cross References',
          description: 'Quran vs other sources',
          route: '/crossref',
          image: '/assets/images/app-icons/dashboard/card-crossref.svg',
          imageAlt: '/assets/images/app-icons/dashboard/icons.webp',
          themeClass: 'theme-crossref',
        },
      ],
    },
    {
      id: 'podcast',
      title: 'Podcast',
      cards: [
        {
          id: 'podcast',
          title: 'Podcast',
          description: 'Episodes + outlines',
          route: '/podcast',
          image: '/assets/images/app-icons/dashboard/card-podcast.svg',
          imageAlt: '/assets/images/app-icons/dashboard/vue.jpg',
          themeClass: 'theme-podcast',
        },
      ],
    },
    {
      id: 'planner',
      title: 'Planner',
      cards: [
        {
          id: 'weekly-planner',
          title: 'Weekly Planner',
          description: 'Plans + tasks',
          route: '/planner',
          image: '/assets/images/app-icons/dashboard/card-planner.svg',
          imageAlt: '/assets/images/app-icons/dashboard/react.jpg',
          themeClass: 'theme-planner',
        },
      ],
    },
  ];

  constructor(private router: Router) {}

  go(card: AppMenuCardItem) {
    if (!card.route) return;
    const commands = Array.isArray(card.route) ? card.route : [card.route];
    this.router.navigate(commands);
  }
}
