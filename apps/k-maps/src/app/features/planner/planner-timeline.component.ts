import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

type PlanStatus = 'to_do' | 'active' | 'review' | 'completed';
type PlanType = 'reading' | 'research' | 'memorisation' | 'mixed' | string;

interface Plan {
  id: string | number;
  title: string;
  type: PlanType;
  start_date?: string;
  end_date?: string;
  status: PlanStatus | string;
  description?: string;
}

@Component({
  selector: 'km-planner-timeline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './planner-timeline.component.html',
  styleUrl: './planner.component.scss',
  styles: [`
    :host {
      display: flex;
      flex: 1;
      min-width: 0;
      min-height: 0;
    }

    .pl__timeline {
      width: 100%;
      min-height: 0;
    }
  `],
})
export class PlannerTimelineComponent {
  @Input({ required: true }) plans!: Plan[];

  typeLabel(type: PlanType): string {
    return String(type ?? 'mixed')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  typeGlyph(type: PlanType): string {
    switch ((type ?? '').toLowerCase()) {
      case 'reading':
        return '◫';
      case 'research':
        return '◎';
      case 'memorisation':
        return '◉';
      case 'mixed':
        return '✦';
      default:
        return '◆';
    }
  }

  statusClass(status?: string): string {
    switch ((status ?? '').toLowerCase()) {
      case 'completed':
      case 'done':
      case 'published':
        return 'completed';
      case 'review':
      case 'reviewed':
      case 'paused':
      case 'on_hold':
      case 'on-hold':
        return 'review';
      case 'in_progress':
      case 'in-progress':
      case 'active':
      case 'current':
      case 'doing':
        return 'active';
      case 'todo':
      case 'to_do':
      case 'to-do':
      case 'queued':
      case 'queue':
      case 'planning':
      case 'planned':
      case 'draft':
      case 'backlog':
      default:
        return 'to_do';
    }
  }

  statusLabel(status?: string): string {
    switch (this.statusClass(status)) {
      case 'completed':
        return 'Finished cleanly';
      case 'review':
        return 'Awaiting check';
      case 'active':
        return 'In motion';
      case 'to_do':
      default:
        return 'Queued next';
    }
  }

  typeColor(type: PlanType): string {
    switch (type) {
      case 'reading':
        return '#1a3a6e';
      case 'research':
        return '#3a1a6e';
      case 'memorisation':
        return '#1a6e3a';
      case 'mixed':
        return '#6e4a1a';
      default:
        return 'rgba(201,168,76,.15)';
    }
  }

  typeTextColor(type: PlanType): string {
    switch (type) {
      case 'reading':
        return '#60a5fa';
      case 'research':
        return '#a78bfa';
      case 'memorisation':
        return '#4ade80';
      case 'mixed':
        return '#fbbf24';
      default:
        return '#c9a84c';
    }
  }

  formatShortDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  }

  formatDayNum(dateStr: string): string {
    try {
      return String(new Date(dateStr).getDate()).padStart(2, '0');
    } catch {
      return '--';
    }
  }

  formatMonAbbr(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
    } catch {
      return '---';
    }
  }

  formatYear(dateStr: string): string {
    try {
      return String(new Date(dateStr).getFullYear());
    } catch {
      return '';
    }
  }

  formatTimelineRange(plan: Plan): string {
    if (plan.start_date && plan.end_date) {
      return `${this.formatShortDate(plan.start_date)} → ${this.formatShortDate(plan.end_date)}`;
    }

    if (plan.start_date) {
      return `Starts ${this.formatShortDate(plan.start_date)}`;
    }

    if (plan.end_date) {
      return `Open until ${this.formatShortDate(plan.end_date)}`;
    }

    return 'Open schedule';
  }

  timelineAnchor(plan: Plan): string {
    return plan.start_date || plan.end_date || '';
  }
}
