import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  QueryList,
  ViewChildren,
  inject,
} from '@angular/core';
import { PlannerGsapService } from '../planner-gsap.service';

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
  selector: 'km-execute-kanban',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './execute-kanban.component.html',
  styleUrl: './execute-kanban.component.scss',
})
export class ExecuteKanbanComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChildren('cardEl') cardEls!: QueryList<ElementRef<HTMLElement>>;
  @ViewChildren('colHeaderEl') colHeaderEls!: QueryList<ElementRef<HTMLElement>>;

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

  private readonly gsap = inject(PlannerGsapService);
  private hoverCleanups: Array<() => void> = [];
  private animated = false;

  ngAfterViewInit(): void {
    this.runAnimations();
    // Re-run if new cards appear (e.g. data loads after init)
    this.cardEls.changes.subscribe(() => {
      this.hoverCleanups.forEach(fn => fn());
      this.hoverCleanups = [];
      this.runAnimations(true);
    });
  }

  ngOnChanges(): void {
    // Trigger re-animation when data arrives if already viewed
    if (this.animated) {
      setTimeout(() => {
        this.hoverCleanups.forEach(fn => fn());
        this.hoverCleanups = [];
        this.runAnimations(true);
      }, 0);
    }
  }

  ngOnDestroy(): void {
    this.hoverCleanups.forEach(fn => fn());
  }

  private runAnimations(cardsOnly = false): void {
    const cards = this.cardEls.map(r => r.nativeElement);

    if (!cardsOnly) {
      const headers = this.colHeaderEls.map(r => r.nativeElement);
      this.gsap.revealColumns(headers);
      this.gsap.revealCards(cards, 0.18);
    } else {
      this.gsap.revealCards(cards);
    }

    cards.forEach(el => {
      this.hoverCleanups.push(this.gsap.setupCardHover(el));
    });

    this.animated = true;
  }

  // ── Template helpers ──────────────────────────────────────────────────────

  plansByStatus(status: PlanStatus): Plan[] {
    return this.groupedPlans[status] ?? [];
  }

  typeLabel(type: PlanType): string {
    return String(type ?? 'mixed').replace(/[_-]+/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  typeGlyph(type: PlanType): string {
    switch ((type ?? '').toLowerCase()) {
      case 'reading':      return '◫';
      case 'research':     return '◎';
      case 'memorisation': return '◉';
      case 'mixed':        return '✦';
      default:             return '◆';
    }
  }

  /** CSS class modifier for type chip colouring */
  typeChipMod(type: PlanType): string {
    switch ((type ?? '').toLowerCase()) {
      case 'reading':      return 'chip--reading';
      case 'research':     return 'chip--research';
      case 'memorisation': return 'chip--memo';
      case 'mixed':        return 'chip--mixed';
      default:             return '';
    }
  }

  statusLabel(status?: string): string {
    switch ((status ?? '').toLowerCase()) {
      case 'completed': case 'done': case 'published': return 'Done';
      case 'review': case 'reviewed': case 'paused':   return 'Under review';
      case 'active': case 'in_progress': case 'doing': return 'In motion';
      default: return 'Queued';
    }
  }

  formatTimelineRange(plan: Plan): string {
    if (plan.start_date && plan.end_date) {
      return `${this.formatShortDate(plan.start_date)} → ${this.formatShortDate(plan.end_date)}`;
    }
    if (plan.start_date) return `Starts ${this.formatShortDate(plan.start_date)}`;
    if (plan.end_date)   return `Until ${this.formatShortDate(plan.end_date)}`;
    return '';
  }

  formatShortDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch { return dateStr; }
  }

  cardSaving(planId: Plan['id']): boolean { return this.savingPlanId === planId; }
  cardDragging(planId: Plan['id']): boolean { return this.draggingPlanId === planId; }
  isDropTarget(status: PlanStatus): boolean { return this.dropTargetStatus === status; }
}
