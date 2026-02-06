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
  selector: 'app-worldview-menu',
  standalone: true,
  imports: [CommonModule, AppHeaderbarComponent, AppMenuCardsComponent],
  templateUrl: './worldview-menu.component.html',
  styleUrls: ['./worldview-menu.component.scss'],
})
export class WorldviewMenuComponent {
  sections: AppMenuCardSection[] = [
    {
      id: 'worldview-menu',
      title: 'Worldview Suite',
      cards: [
        {
          id: 'lessons',
          title: 'Worldview Lessons',
          description: 'Lessons, sources, and chapter planning.',
          route: ['/worldview/lessons'],
          image: 'assets/images/app-icons/dashboard/card-worldview.svg',
          imageAlt: 'assets/images/app-icons/dashboard/image.png',
          themeClass: 'theme-worldview',
        },
        {
          id: 'knowledge',
          title: 'Knowledge Desk',
          description: 'Claims, concepts, and knowledge pipelines.',
          route: ['/worldview/knowledge'],
          image: 'assets/images/app-icons/dashboard/card-crossref.svg',
          imageAlt: 'assets/images/app-icons/dashboard/icons.webp',
          themeClass: 'theme-crossref',
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
