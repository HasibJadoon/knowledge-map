import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DASHBOARD_MENU_SECTIONS } from './dashboard-menu.data';
import { DashboardCardView } from './dashboard-card-grid.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  readonly cards: ReadonlyArray<DashboardCardView> = DASHBOARD_MENU_SECTIONS.map((section) => ({
    title: section.title,
    subtitle: section.subtitle,
    icon: section.icon,
    tone: section.tone,
    route: ['/dashboard', section.key],
  }));
}
