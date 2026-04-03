import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

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
  selector: 'km-planner-kanban',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './planner-kanban.component.html',
  styleUrl: './planner-kanban.component.scss',
})
export class PlannerKanbanComponent {
  @Input({ required: true }) weekLabel!: string;
  @Input({ required: true }) columns!: { status: PlanStatus; label: string; icon: string; caption: string }[];
  @Input({ required: true }) groupedPlans!: Record<PlanStatus, Plan[]>;
  @Input() draggingPlanId: Plan['id'] | null = null;
  @Input() dropTargetStatus: PlanStatus | null = null;
  @Input() savingPlanId: Plan['id'] | null = null;

  @Output() moveRequested = new EventEmitter<{ planId: Plan['id']; status: PlanStatus }>();
  @Output() planDragStarted = new EventEmitter<Plan['id']>();
  @Output() planDragEnded = new EventEmitter<void>();
  @Output() columnDragOver = new EventEmitter<{ event: DragEvent; status: PlanStatus }>();
  @Output() columnDropped = new EventEmitter<{ event: DragEvent; status: PlanStatus }>();
  @Output() dropTargetCleared = new EventEmitter<void>();

  plansByStatus(status: PlanStatus): Plan[] {
    return this.groupedPlans[status] ?? [];
  }

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

  statusLabel(status?: string): string {
    switch ((status ?? '').toLowerCase()) {
      case 'completed':
      case 'done':
      case 'published':
        return 'Done';
      case 'review':
      case 'reviewed':
      case 'paused':
      case 'on_hold':
      case 'on-hold':
        return 'Under review';
      case 'in_progress':
      case 'in-progress':
      case 'active':
      case 'current':
      case 'doing':
        return 'In motion';
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
        return 'Queued';
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

  formatShortDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  }

  cardSaving(planId: Plan['id']): boolean {
    return this.savingPlanId === planId;
  }

  cardDragging(planId: Plan['id']): boolean {
    return this.draggingPlanId === planId;
  }

  isDropTarget(status: PlanStatus): boolean {
    return this.dropTargetStatus === status;
  }
}
