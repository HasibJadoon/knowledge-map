import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card text-center">
      <div class="card-body">
        <h5 class="card-title">{{ title }}</h5>
        <p class="text-muted">{{ message }}</p>
        <button class="btn btn-primary" type="button" (click)="action.emit()" *ngIf="actionLabel">
          {{ actionLabel }}
        </button>
      </div>
    </div>
  `
})
export class EmptyStateComponent {
  @Input() title = 'Nothing here yet';
  @Input() message = 'Create your first item to get started.';
  @Input() actionLabel = '';

  @Output() action = new EventEmitter<void>();
}
