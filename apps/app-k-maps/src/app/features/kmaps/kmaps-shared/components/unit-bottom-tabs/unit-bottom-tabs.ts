import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { albumsOutline, bookOutline, bookmarkOutline, documentTextOutline } from 'ionicons/icons';

import { AppIconTabsComponent, type IconTabItem } from '../../../../../shared/components/icon-tabs/icon-tabs.component';

type UnitBottomTabKey = 'overview' | 'read' | 'highlights' | 'notes';

@Component({
  selector: 'app-kmaps-unit-bottom-tabs',
  standalone: true,
  imports: [CommonModule, IonicModule, AppIconTabsComponent],
  templateUrl: './unit-bottom-tabs.html',
  styleUrl: './unit-bottom-tabs.scss',
})
export class KmapsUnitBottomTabsComponent {
  private readonly router = inject(Router);

  @Input({ required: true }) sourceId = '';
  @Input({ required: true }) unitId = '';

  readonly tabs: ReadonlyArray<IconTabItem> = [
    { key: 'overview', label: 'Overview', icon: albumsOutline },
    { key: 'read', label: 'Read', icon: bookOutline },
    { key: 'highlights', label: 'Highlights', icon: bookmarkOutline },
    { key: 'notes', label: 'Notes', icon: documentTextOutline },
  ];

  get activeKey(): UnitBottomTabKey {
    const url = this.router.url;

    if (url.includes('/read')) {
      return 'read';
    }

    if (url.includes('/distill') || url.includes('/highlights')) {
      return 'highlights';
    }

    if (url.includes('/notes') || url.includes('/capture')) {
      return 'notes';
    }

    return 'overview';
  }

  onTabSelected(tabKey: string): void {
    const key = this.tabs.some((tab) => tab.key === tabKey) ? (tabKey as UnitBottomTabKey) : 'overview';
    void this.router.navigate(this.routeFor(key));
  }

  private routeFor(key: UnitBottomTabKey): string[] {
    const base = ['/worldview', 'sources', this.sourceId, 'units', this.unitId];

    switch (key) {
      case 'read':
        return [...base, 'read'];
      case 'highlights':
        return [...base, 'distill'];
      case 'notes':
        return [...base, 'notes'];
      case 'overview':
      default:
        return base;
    }
  }
}
