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
  templateUrl: './checklist.component.html'
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
