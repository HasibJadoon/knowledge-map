import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { bookOutline, calendarOutline, libraryOutline, playOutline } from 'ionicons/icons';

import { AppIconTabsComponent } from '../../../../shared/components/icon-tabs/icon-tabs.component';
import { KmapsWorkflowService } from '../../kmaps-shared/services/kmaps-workflow.service';

type KmapsBottomTabKey = 'library' | 'sources' | 'distill' | 'planner';

@Component({
  selector: 'app-kmaps-tabs-page',
  standalone: true,
  imports: [IonicModule, AppIconTabsComponent],
  templateUrl: './kmaps-tabs.page.html',
  styleUrl: './kmaps-tabs.page.scss',
})
export class KmapsTabsPage {
  private readonly router = inject(Router);
  private readonly workflow = inject(KmapsWorkflowService);

  readonly tabs = [
    { key: 'library', label: 'Library', icon: libraryOutline },
    { key: 'sources', label: 'Sources', icon: bookOutline },
    { key: 'distill', label: 'Distill', icon: playOutline },
    { key: 'planner', label: 'Planner', icon: calendarOutline },
  ] as const;

  get activeTabKey(): KmapsBottomTabKey {
    const url = this.router.url;

    if (url.startsWith('/planner')) {
      return 'planner';
    }

    if (
      url.includes('/distill') ||
      url.includes('/concepts') ||
      url.includes('/content') ||
      url.includes('/claims') ||
      url.includes('/claim')
    ) {
      return 'distill';
    }

    if (url.includes('/sources/')) {
      return 'sources';
    }

    return 'library';
  }

  onTabSelected(tabKey: string): void {
    switch (tabKey) {
      case 'library':
        void this.router.navigate(['/worldview', 'library']);
        return;
      case 'sources':
        this.openSourceWorkspace();
        return;
      case 'distill':
        this.openDistillWorkspace();
        return;
      case 'planner':
        void this.router.navigate(['/planner']);
        return;
    }
  }

  private openSourceWorkspace(): void {
    const sourceId = this.currentSourceId() || this.workflow.getRecentSources(1)[0]?.id;

    if (!sourceId) {
      void this.router.navigate(['/worldview', 'sources', 'new']);
      return;
    }

    void this.router.navigate(['/worldview', 'sources', sourceId]);
  }

  private openDistillWorkspace(): void {
    const sourceId = this.currentSourceId() || this.workflow.getRecentSources(1)[0]?.id;

    if (!sourceId) {
      void this.router.navigate(['/worldview', 'library']);
      return;
    }

    void this.router.navigate(['/worldview', 'sources', sourceId, 'distill']);
  }

  private currentSourceId(): string | null {
    const match = this.router.url.match(/\/sources\/([^/?#]+)/);
    const value = match?.[1] ? decodeURIComponent(match[1]) : null;
    return value && value !== 'new' ? value : null;
  }
}
