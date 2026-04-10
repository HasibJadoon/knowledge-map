import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import type { CaptureDomain, CaptureItem } from '../planner-workspace.models';

@Component({
  selector: 'km-planner-plan-board',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './planner-plan-board.component.html',
  styleUrl: './planner-plan-board.component.scss',
})
export class PlannerPlanBoardComponent {
  @Input({ required: true }) items: CaptureItem[] = [];
  @Input({ required: true }) weekLabel = '';
  @Output() itemOpened = new EventEmitter<string>();

  readonly domainLabels: Record<CaptureDomain, string> = {
    arabic_media: 'Arabic Media',
    arabic_linguistics: 'Arabic Linguistics',
    quranic_concepts: 'Quranic Concepts',
    worldview: 'Worldview',
    english_expression: 'English Expression',
  };

  readonly statusLabels = {
    draft: 'Draft',
    review: 'Refining',
    ready: 'Ready',
  } as const;

  summary(item: CaptureItem): string {
    return item.payload.plan_state?.summary
      || item.compact_context
      || item.note
      || item.quote
      || 'Open the card to shape this capture into a clearer asset.';
  }

  domainLabel(domain: CaptureDomain): string {
    return this.domainLabels[domain] ?? 'Capture';
  }

  stageLabel(item: CaptureItem): string {
    if (item.payload.plan_state?.pushed_to_kanban_at || item.payload.plan_state?.pushed_to_feed_at) {
      return this.statusLabels.ready;
    }

    if (item.stage === 'review' || item.stage === 'done') {
      return this.statusLabels.review;
    }

    return this.statusLabels.draft;
  }

  formatTime(value: string): string {
    try {
      return new Date(value).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return value;
    }
  }
}
