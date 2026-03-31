import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'km-status-pill',
  standalone: true,
  templateUrl: './status-pill.component.html',
  styleUrl: './status-pill.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusPillComponent {
  readonly label = input.required<string>();
  readonly dotColor = input('#4e8c61');
}
