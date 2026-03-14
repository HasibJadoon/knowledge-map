import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AppIconTabsComponent } from '../../../../shared/components/icon-tabs/icon-tabs.component';
import {
  albumsOutline,
  bookOutline,
  calendarOutline,
  gridOutline,
  micOutline,
  sparklesOutline,
} from 'ionicons/icons';

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
    { key: 'kanban', label: 'Kanban', icon: gridOutline },
    { key: 'inbox', label: 'Inbox', icon: albumsOutline },
    { key: 'lessons', label: 'Lessons', icon: bookOutline },
    { key: 'podcast', label: 'Podcast', icon: micOutline },
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

function isPlannerTabKey(value: string | null | undefined): value is string {
  return value === 'week'
    || value === 'kanban'
    || value === 'inbox'
    || value === 'lessons'
    || value === 'podcast'
    || value === 'review';
}
