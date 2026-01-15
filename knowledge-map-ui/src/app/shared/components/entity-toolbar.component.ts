import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-entity-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="d-flex flex-wrap gap-2 align-items-center mb-3">
      <div class="me-auto">
        <h4 class="mb-0">{{ title }}</h4>
        <small class="text-muted" *ngIf="subtitle">{{ subtitle }}</small>
      </div>
      <input
        class="form-control w-auto"
        [placeholder]="searchPlaceholder"
        type="text"
        [(ngModel)]="q"
        (ngModelChange)="search.emit(q)"
      />
      <button class="btn btn-primary" type="button" (click)="add.emit()" *ngIf="!hideAdd">
        {{ addLabel }}
      </button>
    </div>
  `
})
export class EntityToolbarComponent {
  @Input() title = 'Items';
  @Input() subtitle = '';
  @Input() searchPlaceholder = 'Search';
  @Input() addLabel = 'Add';
  @Input() hideAdd = false;

  @Output() search = new EventEmitter<string>();
  @Output() add = new EventEmitter<void>();

  q = '';
}
