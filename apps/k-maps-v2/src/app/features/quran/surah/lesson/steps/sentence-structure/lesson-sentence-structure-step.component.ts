import {
  ChangeDetectionStrategy, Component,
  Input, OnChanges, SimpleChanges,
} from '@angular/core';

import {
  StudyLessonResponse,
  UnitTaskVm,
} from '../../../../../../shared/services/surah-modules.service';
import {
  SentenceStructureCanvasComponent,
  SsTreeNode,
} from './sentence-structure-canvas.component';

// ── Payload shape from DB ─────────────────────────────────────────────────────

interface SsPayload {
  term_colors: Record<string, string>;
  tree: SsTreeNode;
}

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector:        'km-lesson-sentence-structure-step',
  standalone:      true,
  imports:         [SentenceStructureCanvasComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl:     './lesson-sentence-structure-step.component.html',
  styleUrl:        './lesson-sentence-structure-step.component.scss',
})
export class LessonSentenceStructureStepComponent implements OnChanges {

  @Input({ required: true }) lesson!: StudyLessonResponse;

  sentences:  SsPayload[] = [];
  activeIdx = 0;
  hasTask   = false;

  get current(): SsPayload | null {
    return this.sentences[this.activeIdx] ?? null;
  }

  ngOnChanges(c: SimpleChanges): void {
    if ('lesson' in c) this.rebuild();
  }

  select(idx: number): void {
    if (idx >= 0 && idx < this.sentences.length) this.activeIdx = idx;
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private rebuild(): void {
    this.sentences = [];
    this.activeIdx = 0;

    const task = this.lesson?.tasks?.find(t => t.task_type === 'sentence_structure') ?? null;
    this.hasTask = !!task;
    if (!task) return;

    // Children tasks → multiple sentences with navigation
    if (task.children?.length) {
      this.sentences = [...task.children]
        .sort((a, b) => (a.step_no ?? 0) - (b.step_no ?? 0))
        .map(c => this.parse(c.task_json))
        .filter((p): p is SsPayload => p != null);
    }

    // Fallback: root task_json
    if (!this.sentences.length) {
      const root = this.parse(task.task_json);
      if (root) this.sentences = [root];
    }
  }

  private parse(raw: unknown): SsPayload | null {
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    if (o['tree'] && typeof o['tree'] === 'object' &&
        o['term_colors'] && typeof o['term_colors'] === 'object') {
      return {
        tree:        o['tree']        as SsTreeNode,
        term_colors: o['term_colors'] as Record<string, string>,
      };
    }
    return null;
  }
}
