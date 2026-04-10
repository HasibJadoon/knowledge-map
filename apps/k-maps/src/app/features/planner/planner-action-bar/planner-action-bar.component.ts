import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'km-planner-action-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './planner-action-bar.component.html',
  styleUrl: './planner-action-bar.component.scss',
})
export class PlannerActionBarComponent {
  @Input() busy = false;
  @Output() pushToFeed = new EventEmitter<void>();
  @Output() pushToKanban = new EventEmitter<void>();
  @Output() saveDraft = new EventEmitter<void>();
  @Output() archive = new EventEmitter<void>();
}
