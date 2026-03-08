import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { DashboardTone } from './dashboard-menu.data';

export type DashboardCardView = {
  title: string;
  subtitle: string;
  icon: string;
  route: string[];
  tone: DashboardTone;
};

@Component({
  selector: 'app-dashboard-card-grid',
  templateUrl: './dashboard-card-grid.component.html',
  styleUrl: './dashboard-card-grid.component.scss',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardCardGridComponent {
  @Input({ required: true }) cards: ReadonlyArray<DashboardCardView> = [];
  @Input() emptyText = 'No menu items.';

  trackByCard(_: number, card: DashboardCardView): string {
    return `${card.title}:${card.route.join('/')}`;
  }
}
