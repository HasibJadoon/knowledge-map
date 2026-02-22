import { Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MenuController } from '@ionic/angular';
import { albumsOutline, arrowBackOutline, bookOutline, calendarOutline, gridOutline, micOutline, sparklesOutline } from 'ionicons/icons';

@Component({
  selector: 'app-planner-tabs-page',
  standalone: false,
  templateUrl: './planner-tabs.page.html',
  styleUrl: './planner-tabs.page.scss',
})
export class PlannerTabsPage {
  private readonly plannerBasePath = '/planner';
  private readonly tabRouteMap: Record<string, string> = {
    week: `${this.plannerBasePath}/week`,
    kanban: `${this.plannerBasePath}/kanban`,
    inbox: `${this.plannerBasePath}/inbox`,
    lessons: `${this.plannerBasePath}/lessons`,
    podcast: `${this.plannerBasePath}/podcast`,
    review: `${this.plannerBasePath}/review`,
  };

  private readonly location = inject(Location);
  private readonly menuController = inject(MenuController);
  private readonly router = inject(Router);
  readonly icons = {
    arrowBackOutline,
  };

  readonly tabs = [
    { key: 'week', label: 'Week', icon: calendarOutline },
    { key: 'kanban', label: 'Kanban', icon: gridOutline },
    { key: 'inbox', label: 'Inbox', icon: albumsOutline },
    { key: 'lessons', label: 'Lessons', icon: bookOutline },
    { key: 'podcast', label: 'Podcast', icon: micOutline },
    { key: 'review', label: 'Review', icon: sparklesOutline },
  ];

  async ionViewWillEnter(): Promise<void> {
    await this.menuController.enable(true, 'main-menu');
  }

  get activeTabKey(): string {
    return this.resolveTabKeyFromUrl(this.router.url);
  }

  get toolbarHeading(): string {
    const headingMap: Record<string, string> = {
      week: 'Week',
      kanban: 'Kanban',
      inbox: 'Inbox',
      lessons: 'Lessons',
      podcast: 'Podcast',
      review: 'Review',
    };
    return headingMap[this.activeTabKey] ?? 'Week';
  }

  onTabSelected(tabKey: string): void {
    const targetUrl = this.tabRouteMap[tabKey];
    if (!targetUrl || this.router.url.startsWith(targetUrl)) {
      return;
    }
    void this.router.navigateByUrl(targetUrl);
  }

  back(): void {
    this.location.back();
  }

  private resolveTabKeyFromUrl(url: string): string {
    if (url.includes('/planner/kanban')) return 'kanban';
    if (url.includes('/planner/inbox')) return 'inbox';
    if (url.includes('/planner/lessons')) return 'lessons';
    if (url.includes('/planner/podcast')) return 'podcast';
    if (url.includes('/planner/review')) return 'review';
    return 'week';
  }
}
