import { NgIf } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import {
  BreadcrumbRouterComponent,
  BreadcrumbRouterService,
  ContainerComponent,
  HeaderComponent,
  HeaderNavComponent,
  HeaderTogglerDirective,
  IBreadcrumbItem,
  SidebarToggleDirective,
} from '@coreui/angular';

import { IconDirective } from '@coreui/icons-angular';
import {
  AppHeaderSettingsDropdownComponent,
  AppPageHeaderTabsComponent,
} from '../../../../shared/components';
import { PageHeaderService } from '../../../../shared/services/page-header.service';
import { PageHeaderTabsConfig } from '../../../../shared/models/core/page-header.model';
import { toSignal } from '@angular/core/rxjs-interop';

const SKIPPED_BREADCRUMB_LABELS = new Set(['Quran Lessons']);

@Component({
  selector: 'app-default-header',
  templateUrl: './default-header.component.html',
  styleUrls: ['./default-header.component.scss'],
  imports: [
    ContainerComponent,
    HeaderTogglerDirective,
    SidebarToggleDirective,
    IconDirective,
    HeaderNavComponent,
    NgIf,
    RouterLink,
    RouterLinkActive,
    BreadcrumbRouterComponent,
    AppPageHeaderTabsComponent,
    AppHeaderSettingsDropdownComponent,
  ],
})
export class DefaultHeaderComponent extends HeaderComponent {
  private readonly pageHeaderService = inject(PageHeaderService);
  private readonly breadcrumbService = inject(BreadcrumbRouterService);

  private readonly breadcrumbsSignal = toSignal(this.breadcrumbService.breadcrumbs$, {
    initialValue: [],
  });

  pageHeaderTabs = toSignal(this.pageHeaderService.tabs$, {
    initialValue: null as PageHeaderTabsConfig | null,
  });

  sidebarId = input('sidebar1');

  filteredBreadcrumbs = computed<IBreadcrumbItem[]>(() =>
    this.breadcrumbsSignal().filter((item) => !SKIPPED_BREADCRUMB_LABELS.has(item?.label ?? ''))
  );

  singleBreadcrumbTitle = computed(() => {
    const items = this.filteredBreadcrumbs();
    if (items.length !== 1) return '';
    return String(items[0]?.label ?? '').trim();
  });
}
