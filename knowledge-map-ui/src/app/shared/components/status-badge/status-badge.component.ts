import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-badge.component.html'
})
export class StatusBadgeComponent {
  @Input() status: string | null = null;

  get label(): string {
    return (this.status ?? 'unknown').toLowerCase();
  }

  get badgeClass(): string {
    const s = this.label;
    if (['active', 'done', 'published', 'reviewed'].includes(s)) return 'bg-success';
    if (['draft', 'doing', 'planned'].includes(s)) return 'bg-warning text-dark';
    if (['archived', 'inactive'].includes(s)) return 'bg-secondary';
    if (['error', 'failed'].includes(s)) return 'bg-danger';
    return 'bg-info text-dark';
  }
}
