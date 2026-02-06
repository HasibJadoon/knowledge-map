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
          id: 'episodes',
          title: 'Podcast Episodes',
          description: 'Manage episode outlines and recordings.',
          route: ['/podcast/episodes'],
          image: 'assets/images/app-icons/dashboard/card-podcast.svg',
          imageAlt: 'assets/images/app-icons/dashboard/vue.jpg',
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
    if (!card.route) return;
    const route = Array.isArray(card.route) ? card.route : [card.route];
    this.router.navigate(route);
  }
}
