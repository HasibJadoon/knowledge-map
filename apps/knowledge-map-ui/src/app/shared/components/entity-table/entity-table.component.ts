import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-entity-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './entity-table.component.html'
})
export class EntityTableComponent {
  @Input() columns: string[] = [];
  @Input() rows: Array<Record<string, unknown>> = [];

  trackByRow = (index: number) => index;
}
