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
  selector: 'app-planner-menu',
  standalone: true,
  imports: [CommonModule, AppHeaderbarComponent, AppMenuCardsComponent],
  templateUrl: './planner-menu.component.html',
  styleUrls: ['./planner-menu.component.scss'],
})
export class PlannerMenuComponent {
  sections: AppMenuCardSection[] = [
    {
      id: 'planner-menu',
      title: 'Planner Suite',
      cards: [
        {
          id: 'weekly-plans',
          title: 'Weekly Plans',
          description: 'Plan weekly sprints and tasks.',
          route: ['/planner/weekly'],
          image: 'assets/images/app-icons/dashboard/card-planner.svg',
          imageAlt: 'assets/images/app-icons/dashboard/react.jpg',
          themeClass: 'theme-planner',
        },
        {
          id: 'new-plan',
          title: 'New Weekly Plan',
          description: 'Create a new weekly planning session.',
          route: ['/planner/new'],
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
