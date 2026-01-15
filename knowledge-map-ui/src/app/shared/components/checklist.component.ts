import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ChecklistItem = {
  label: string;
  done: boolean;
};

@Component({
  selector: 'app-checklist',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="d-flex flex-column gap-2">
      <label class="form-check" *ngFor="let item of items; let i = index">
        <input
          class="form-check-input"
          type="checkbox"
          [checked]="item.done"
          (change)="toggle(i)"
        />
        <span class="form-check-label">{{ item.label }}</span>
      </label>
    </div>
  `
})
export class ChecklistComponent {
  @Input() items: ChecklistItem[] = [];
  @Output() itemsChange = new EventEmitter<ChecklistItem[]>();

  toggle(index: number) {
    const next = this.items.map((item, i) =>
      i === index ? { ...item, done: !item.done } : item
    );
    this.items = next;
    this.itemsChange.emit(next);
  }
}
