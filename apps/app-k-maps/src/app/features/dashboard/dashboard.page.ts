import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DASHBOARD_MENU_SECTIONS } from './dashboard-menu.data';
import { toDashboardSectionCard } from './dashboard-card.model';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  readonly cards = DASHBOARD_MENU_SECTIONS.map(toDashboardSectionCard);
}
