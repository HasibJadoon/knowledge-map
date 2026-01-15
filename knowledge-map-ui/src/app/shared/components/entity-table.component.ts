import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-entity-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="table-responsive">
      <table class="table table-striped align-middle">
        <thead>
          <tr>
            <th *ngFor="let col of columns">{{ col }}</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let row of rows; trackBy: trackByRow">
            <td *ngFor="let col of columns">{{ row?.[col] ?? '' }}</td>
          </tr>
          <tr *ngIf="rows.length === 0">
            <td class="text-muted" [attr.colspan]="columns.length">No results.</td>
          </tr>
        </tbody>
      </table>
    </div>
  `
})
export class EntityTableComponent {
  @Input() columns: string[] = [];
  @Input() rows: Array<Record<string, unknown>> = [];

  trackByRow = (index: number) => index;
}
