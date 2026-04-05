import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import type { PlannerStripItem, PlannerWorkspace } from '../planner-workspace.models';

@Component({
  selector: 'km-planner-strip-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './planner-strip-menu.component.html',
  styleUrl: './planner-strip-menu.component.scss',
})
export class PlannerStripMenuComponent {
  @Input({ required: true }) items: PlannerStripItem[] = [];
  @Input({ required: true }) activeWorkspace!: PlannerWorkspace;
  @Output() workspaceSelected = new EventEmitter<PlannerWorkspace>();
}
