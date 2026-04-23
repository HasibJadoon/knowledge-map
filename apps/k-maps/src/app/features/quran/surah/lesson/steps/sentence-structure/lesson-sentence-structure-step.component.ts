import {
  ChangeDetectionStrategy, Component,
  HostListener, Input, OnChanges, SimpleChanges,
} from '@angular/core';

import {
  StudyLessonResponse,
} from '../../../../../../shared/services/quran/quran-surah.service';
import {
  SentenceStructureCanvasComponent,
  SsLessonMeta,
  SsTreeNode,
} from './sentence-structure-canvas.component';
import { SentenceStructureNav3dComponent } from './sentence-structure-nav3d.component';

// ── Payload shape from DB ─────────────────────────────────────────────────────

interface SsPayload {
  term_colors: Record<string, string>;
  tree: SsTreeNode;
  /** task_id of the child task (multi-sentence) or root task (single-sentence) */
  taskId?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector:        'km-lesson-sentence-structure-step',
  standalone:      true,
  imports:         [SentenceStructureCanvasComponent, SentenceStructureNav3dComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl:     './lesson-sentence-structure-step.component.html',
  styleUrl:        './lesson-sentence-structure-step.component.scss',
})
export class LessonSentenceStructureStepComponent implements OnChanges {

  @Input({ required: true }) lesson!: StudyLessonResponse;

  sentences:  SsPayload[] = [];
  activeIdx = 0;
  hasTask   = false;

  /** Resolved once per lesson load — passed straight to canvas */
  lessonMeta: SsLessonMeta | null = null;

  // ── Swipe navigation ─────────────────────────────────────────────────────

  private swipeStartX = 0;
  private swipeStartY = 0;

  @HostListener('touchstart', ['$event'])
  onTouchStart(e: TouchEvent): void {
    this.swipeStartX = e.touches[0].clientX;
    this.swipeStartY = e.touches[0].clientY;
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(e: TouchEvent): void {
    if (this.sentences.length <= 1) return;
    const dx = e.changedTouches[0].clientX - this.swipeStartX;
    const dy = e.changedTouches[0].clientY - this.swipeStartY;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx > 0) this.select(this.activeIdx - 1);  // swipe right → previous
    else         this.select(this.activeIdx + 1);  // swipe left  → next
  }

  // ── Accessors ─────────────────────────────────────────────────────────────

  get current(): SsPayload | null {
    return this.sentences[this.activeIdx] ?? null;
  }

  /** lessonMeta merged with the current sentence's child taskId (for DB saves) */
  get currentMeta(): SsLessonMeta | null {
    const meta = this.lessonMeta;
    const cur  = this.current;
    if (!meta) return null;
    if (cur?.taskId) return { ...meta, childTaskId: cur.taskId };
    return meta;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnChanges(c: SimpleChanges): void {
    if ('lesson' in c) this.rebuild();
  }

  select(idx: number): void {
    if (idx >= 0 && idx < this.sentences.length) this.activeIdx = idx;
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private rebuild(): void {
    this.sentences  = [];
    this.activeIdx  = 0;
    this.lessonMeta = null;

    const task = this.lesson?.tasks?.find(t => t.task_type === 'sentence_structure') ?? null;
    this.hasTask = !!task;
    if (!task) return;

    // Build lessonMeta for the canvas so it can call the API directly.
    // lessonId may be null for sentence-structure tasks (the lesson page doesn't
    // always pass it through), so we allow 0 as a fallback — the patch endpoint
    // only needs taskId, unitId, and containerId.
    if (this.lesson.unit) {
      this.lessonMeta = {
        lessonId:    this.lesson.lessonId ?? 0,
        taskId:      task.task_id,
        stepNo:      task.step_no ?? 300,
        unitId:      this.lesson.unit.unit_id,
        containerId: this.lesson.unit.container_id ?? '',
      };
    }

    // Multiple sentences via children tasks
    if (task.children?.length) {
      this.sentences = [...task.children]
        .sort((a, b) => (a.step_no ?? 0) - (b.step_no ?? 0))
        .map(c => this.parse(c.task_json, c.task_id))
        .filter((p): p is SsPayload => p != null);
    }

    // Fallback: root task_json
    if (!this.sentences.length) {
      const root = this.parse(task.task_json, task.task_id);
      if (root) this.sentences = [root];
    }
  }

  private parse(raw: unknown, taskId?: string): SsPayload | null {
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    if (o['tree'] && typeof o['tree'] === 'object' &&
        o['term_colors'] && typeof o['term_colors'] === 'object') {
      return {
        tree:        o['tree']        as SsTreeNode,
        term_colors: o['term_colors'] as Record<string, string>,
        taskId,
      };
    }
    return null;
  }
}
