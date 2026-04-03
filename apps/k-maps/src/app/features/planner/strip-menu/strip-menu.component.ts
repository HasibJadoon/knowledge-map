import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import type { PlannerStripItem, PlannerWorkspace } from '../models/planner.models';

@Component({
  selector: 'km-strip-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './strip-menu.component.html',
  styleUrl: './strip-menu.component.scss',
})
export class PlannerStripMenuComponent {
  @Input({ required: true }) items: PlannerStripItem[] = [];
  @Input({ required: true }) activeWorkspace!: PlannerWorkspace;
  @Output() workspaceSelected = new EventEmitter<PlannerWorkspace>();
}
