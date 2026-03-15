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
  selector: 'app-podcast-menu',
  standalone: true,
  imports: [CommonModule, AppHeaderbarComponent, AppMenuCardsComponent],
  templateUrl: './podcast-menu.component.html',
  styleUrls: ['./podcast-menu.component.scss'],
})
export class PodcastMenuComponent {
  sections: AppMenuCardSection[] = [
    {
      id: 'podcast-menu',
      title: 'Podcast Suite',
      cards: [
        {
          id: 'generated-worldview',
          title: 'Generated Drafts',
          description: 'Open podcast drafts produced from worldview distill batches.',
          route: ['/podcast/episodes'],
          image: 'assets/images/app-icons/dashboard/card-podcast.svg',
          imageAlt: 'assets/images/app-icons/dashboard/card-worldview.svg',
          themeClass: 'theme-podcast',
        },
        {
          id: 'episodes',
          title: 'Episode Library',
          description: 'Review every podcast episode, including manual and generated drafts.',
          route: ['/podcast/episodes'],
          image: 'assets/images/app-icons/dashboard/card-podcast.svg',
          imageAlt: 'assets/images/app-icons/dashboard/card-podcast.svg',
          themeClass: 'theme-podcast',
        },
        {
          id: 'new-episode',
          title: 'New Episode',
          description: 'Create a new podcast episode draft.',
          route: ['/podcast/new'],
          image: 'assets/images/app-icons/dashboard/card-memory.svg',
          imageAlt: 'assets/images/app-icons/dashboard/arabic-memory-card.png',
          themeClass: 'theme-memory',
        },
      ],
    },
  ];

  constructor(private router: Router) {}

  onCardSelect(card: AppMenuCardItem) {
    if (card.id === 'generated-worldview') {
      this.router.navigate(['/podcast/episodes'], { queryParams: { source: 'worldview' } });
      return;
    }

    if (!card.route) return;
    const route = Array.isArray(card.route) ? card.route : [card.route];
    this.router.navigate(route);
  }
}
