import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'km-empty-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  /** Main heading — e.g. "No Passages Found" */
  title = input<string>('Nothing Here Yet');
  /** Subtitle / descriptive message */
  message = input<string>('');
  /** Optional Arabic decorative word shown above the ornament */
  arabicWord = input<string>('');
}
