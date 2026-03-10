import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { formatUnitTypeLabel } from '../../models/kmaps.models';
import { KmapsWorkflowService } from '../../services/kmaps-workflow.service';

type UnitWorkspaceTabKey = 'chapter' | 'notes' | 'distill' | 'claim' | 'concepts';

type UnitWorkspaceTab = {
  key: UnitWorkspaceTabKey;
  label: string;
  icon: string;
};

const WORKSPACE_TABS: UnitWorkspaceTab[] = [
  { key: 'chapter', label: 'Chapter', icon: 'book-outline' },
  { key: 'notes', label: 'Notes', icon: 'document-text-outline' },
  { key: 'distill', label: 'Distill', icon: 'sparkles-outline' },
  { key: 'claim', label: 'Claim', icon: 'flash-outline' },
  { key: 'concepts', label: 'Concepts', icon: 'git-network-outline' },
];

@Component({
  selector: 'app-kmaps-unit-workspace-tabs',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './unit-workspace-tabs.html',
  styleUrl: './unit-workspace-tabs.scss',
})
export class KmapsUnitWorkspaceTabsComponent {
  private readonly router = inject(Router);
  private readonly workflow = inject(KmapsWorkflowService);

  @Input({ required: true }) sourceId = '';
  @Input({ required: true }) unitId = '';

  readonly tabs = WORKSPACE_TABS;

  get activeKey(): UnitWorkspaceTabKey {
    const url = this.router.url;

    if (url.includes('/notes') || url.includes('/capture')) {
      return 'notes';
    }

    if (url.includes('/distill')) {
      return 'distill';
    }

    if (url.includes('/claim')) {
      return 'claim';
    }

    if (url.includes('/concepts')) {
      return 'concepts';
    }

    return 'chapter';
  }

  tabLabel(tab: UnitWorkspaceTab): string {
    if (tab.key !== 'chapter') {
      return tab.label;
    }

    const unitType = this.workflow.getUnit(this.unitId)?.unitType;
    return unitType ? formatUnitTypeLabel(unitType) : tab.label;
  }

  onTabChanged(value: string | number | null | undefined): void {
    const normalized = typeof value === 'string' ? value : '';
    const key = this.tabs.some((tab) => tab.key === normalized) ? (normalized as UnitWorkspaceTabKey) : 'chapter';
    void this.router.navigate(this.routeFor(key));
  }

  private routeFor(key: UnitWorkspaceTabKey): string[] {
    const base = ['/worldview', 'sources', this.sourceId, 'units', this.unitId];

    switch (key) {
      case 'notes':
        return [...base, 'notes'];
      case 'distill':
        return [...base, 'distill'];
      case 'claim':
        return [...base, 'claim'];
      case 'concepts':
        return [...base, 'concepts'];
      case 'chapter':
      default:
        return base;
    }
  }
}
