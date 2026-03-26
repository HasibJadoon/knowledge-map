import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';

import {
  StudyLessonResponse,
  UnitTaskVm,
} from '../../../../../../shared/services/surah-modules.service';
import {
  SentenceStructureCanvasComponent,
  SsTreeNode,
} from './sentence-structure-canvas.component';

// ── Payload type coming from DB ───────────────────────────────────────────────

interface SsPayload {
  term_colors: Record<string, string>;
  tree: SsTreeNode;
}

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'km-lesson-sentence-structure-step',
  standalone: true,
  imports: [SentenceStructureCanvasComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lesson-sentence-structure-step.component.html',
  styleUrl:    './lesson-sentence-structure-step.component.scss',
})
export class LessonSentenceStructureStepComponent implements OnChanges {

  @Input({ required: true }) lesson!: StudyLessonResponse;

  treeData:   SsTreeNode | null           = null;
  termColors: Record<string, string>      = {};
  hasTask     = false;

  // Leaf sentences from children tasks (step_no ordered)
  sentences: SsPayload[] = [];
  selectedIdx = 0;

  get currentTree(): SsTreeNode | null {
    return this.sentences[this.selectedIdx]?.tree ?? this.treeData;
  }

  get currentColors(): Record<string, string> {
    return this.sentences[this.selectedIdx]?.term_colors ?? this.termColors;
  }

  get hasSentences(): boolean {
    return this.sentences.length > 0 || this.treeData != null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('lesson' in changes) this.rebuild();
  }

  selectSentence(idx: number): void {
    if (idx >= 0 && idx < this.sentences.length) this.selectedIdx = idx;
  }

  private rebuild(): void {
    this.treeData   = null;
    this.termColors = {};
    this.sentences  = [];
    this.selectedIdx = 0;

    const task = this.findTask();
    this.hasTask = !!task;
    if (!task) return;

    // Try root task_json first
    const root = this.extractPayload(task.task_json);
    if (root) {
      this.treeData   = root.tree;
      this.termColors = root.term_colors;
    }

    // Children tasks → multiple sentences with navigation
    if (task.children?.length) {
      this.sentences = [...task.children]
        .sort((a, b) => (a.step_no ?? 0) - (b.step_no ?? 0))
        .map(c => this.extractPayload(c.task_json))
        .filter((p): p is SsPayload => p != null);

      if (this.sentences.length > 0) {
        // Use children, not the root tree
        this.treeData   = null;
        this.termColors = {};
      }
    }
  }

  private findTask(): UnitTaskVm | null {
    return this.lesson?.tasks?.find(t => t.task_type === 'sentence_structure') ?? null;
  }

  private extractPayload(raw: unknown): SsPayload | null {
    if (!raw || typeof raw !== 'object') return null;
    const obj = raw as Record<string, unknown>;
    if (
      obj['tree'] && typeof obj['tree'] === 'object' &&
      obj['term_colors'] && typeof obj['term_colors'] === 'object'
    ) {
      return {
        tree:        obj['tree'] as SsTreeNode,
        term_colors: obj['term_colors'] as Record<string, string>,
      };
    }
    return null;
  }
}
