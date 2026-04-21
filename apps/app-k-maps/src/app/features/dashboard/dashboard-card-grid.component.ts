import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { DashboardCardView } from '../../shared/models/core/dashboard-card.model';

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
