import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export type CreatorBadgeTone = 'neutral' | 'info' | 'warning' | 'success' | 'accent';

@Component({
  selector: 'app-status-badge',
  standalone: false,
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.scss',
})
export class StatusBadgeComponent {
  @Input() label = '';
  @Input() tone: CreatorBadgeTone = 'neutral';
}
