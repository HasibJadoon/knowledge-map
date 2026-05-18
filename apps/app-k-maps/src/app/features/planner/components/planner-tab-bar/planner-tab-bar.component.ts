import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AppIconTabsComponent } from '../../../../shared/components/icon-tabs/icon-tabs.component';
import {
  analyticsOutline,
  calendarNumberOutline,
  calendarOutline,
  clipboardOutline,
  createOutline,
  gridOutline,
  sparklesOutline,
} from 'ionicons/icons';

const PLANNER_TAB_KEYS = ['week', 'capture', 'plan', 'kanban', 'calendar', 'timeline', 'review'] as const;
type PlannerTabKey = (typeof PLANNER_TAB_KEYS)[number];

@Component({
  selector: 'app-planner-tab-bar',
  standalone: true,
  imports: [AppIconTabsComponent],
  templateUrl: './planner-tab-bar.component.html',
  styleUrl: './planner-tab-bar.component.scss',
})
export class PlannerTabBarComponent {
  readonly tabs: ReadonlyArray<{ key: string; label: string; icon: string }> = [
    { key: 'week', label: 'Week', icon: calendarOutline },
    { key: 'capture', label: 'Capture', icon: createOutline },
    { key: 'plan', label: 'Plan', icon: clipboardOutline },
    { key: 'kanban', label: 'Kanban', icon: gridOutline },
    { key: 'calendar', label: 'Calendar', icon: calendarNumberOutline },
    { key: 'timeline', label: 'Timeline', icon: analyticsOutline },
    { key: 'review', label: 'Review', icon: sparklesOutline },
  ];
  @Input() activeTab = 'week';
  @Output() tabSelected = new EventEmitter<string>();

  onTabSelected(tabKey: string): void {
    if (!isPlannerTabKey(tabKey) || tabKey === this.activeTab) {
      return;
    }

    this.tabSelected.emit(tabKey);
  }
}

function isPlannerTabKey(value: string | null | undefined): value is PlannerTabKey {
  return PLANNER_TAB_KEYS.includes(value as PlannerTabKey);
}
