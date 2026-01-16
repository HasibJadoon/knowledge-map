import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './empty-state.component.html'
})
export class EmptyStateComponent {
  @Input() title = 'Nothing here yet';
  @Input() message = 'Create your first item to get started.';
  @Input() actionLabel = '';

  @Output() action = new EventEmitter<void>();
}
