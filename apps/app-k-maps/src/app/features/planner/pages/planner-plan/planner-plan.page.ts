import { Component, computed, inject, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { CaptureNote, PlannerLane, PlannerTask } from '../../../../shared/models/planner/sprint.models';
import { CaptureNotesService } from '../../../../shared/services/planner/capture-notes.service';
import { PlannerService } from '../../../../shared/services/planner/planner.service';
import { computeWeekStartSydney, formatWeekRangeLabel } from '../../../../shared/utils/planner/week-start.util';

interface PlanSection {
  id: string;
  title: string;
  body: string;
}

interface PlanNote {
  id: string;
  label: string;
  content: string;
}

const SECTION_BLUEPRINT: ReadonlyArray<string> = [
  'Main Thought',
  'Breakdown',
  'Possible Outputs',
  'Notes',
  'References',
];

const NOTE_BLUEPRINT: ReadonlyArray<string> = ['Source', 'Quote', 'Resources'];
const PLAN_LANES: PlannerLane[] = ['notes', 'lesson', 'podcast', 'admin'];

@Component({
  selector: 'app-planner-plan-page',
  standalone: false,
  templateUrl: './planner-plan.page.html',
  styleUrl: './planner-plan.page.scss',
})
export class PlannerPlanPage {
  private readonly notes = inject(CaptureNotesService);
  private readonly planner = inject(PlannerService);
  private readonly toastController = inject(ToastController);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly weekStart = signal(computeWeekStartSydney(this.planner.currentWeekStart()));
  readonly weekLabel = computed(() => formatWeekRangeLabel(this.weekStart()));

  readonly captures = signal<CaptureNote[]>([]);
  readonly selectedNote = signal<CaptureNote | null>(null);

  readonly titleControl = new FormControl('', { nonNullable: true });
  readonly summaryControl = new FormControl('', { nonNullable: true });
  readonly estimateControl = new FormControl(45, { nonNullable: true });
  readonly lane = signal<PlannerLane>('notes');

  readonly sections = signal<PlanSection[]>([]);
  readonly accordionNotes = signal<PlanNote[]>([]);
  readonly openNoteIds = signal<Set<string>>(new Set());

  readonly lanes = PLAN_LANES;

  laneLabel(lane: PlannerLane): string {
    return lane === 'lesson' ? 'Lesson' : lane === 'podcast' ? 'Podcast' : lane === 'notes' ? 'Notes' : 'Admin';
  }

  constructor() {
    void this.load();
  }

  setLane(value: string | number | null | undefined): void {
    if (value === 'lesson' || value === 'podcast' || value === 'notes' || value === 'admin') {
      this.lane.set(value);
    }
  }

  openPlan(note: CaptureNote): void {
    this.selectedNote.set(note);
    this.titleControl.setValue(note.title || 'Untitled plan');
    this.summaryControl.setValue(firstLine(note.text));
    this.sections.set(SECTION_BLUEPRINT.map((title, index) => ({
      id: `section-${index}`,
      title,
      body: '',
    })));
    this.accordionNotes.set(NOTE_BLUEPRINT.map((label, index) => ({
      id: `note-${index}`,
      label,
      content: label === 'Source' ? sourceLine(note.text) : label === 'Quote' ? quoteLine(note.text) : '',
    })));
    this.openNoteIds.set(new Set());
  }

  closePlan(): void {
    this.selectedNote.set(null);
    this.sections.set([]);
    this.accordionNotes.set([]);
  }

  addSection(): void {
    this.sections.update((rows) => [
      ...rows,
      { id: `section-${rows.length}-${Date.now()}`, title: 'Section', body: '' },
    ]);
  }

  toggleNote(note: PlanNote): void {
    this.openNoteIds.update((open) => {
      const next = new Set(open);
      if (next.has(note.id)) {
        next.delete(note.id);
      } else {
        next.add(note.id);
      }
      return next;
    });
  }

  isNoteOpen(note: PlanNote): boolean {
    return this.openNoteIds().has(note.id);
  }

  async pushToKanban(): Promise<void> {
    const note = this.selectedNote();
    if (!note || this.saving()) {
      return;
    }

    const title = this.titleControl.value.trim();
    if (!title) {
      await this.presentToast('Add a plan title first.');
      return;
    }

    const estimate = Number(this.estimateControl.value);
    if (!Number.isFinite(estimate) || estimate <= 0) {
      await this.presentToast('Estimate must be a positive number.');
      return;
    }

    this.saving.set(true);
    try {
      const task = this.buildTask(title, Math.round(estimate));
      await firstValueFrom(this.planner.createTask({
        week_start: this.weekStart(),
        item_json: task,
        related_type: 'sp_capture_notes',
        related_id: note.id,
      }));

      // The plan now lives as a Kanban task; clear the source capture from the
      // inbox. A failed archive must not report the push itself as failed.
      try {
        await firstValueFrom(this.notes.archive(note.id));
      } catch {
        /* keep the capture if archiving fails */
      }

      this.captures.update((rows) => rows.filter((row) => row.id !== note.id));
      this.closePlan();
      await this.presentToast('Plan pushed to Kanban.');
    } catch {
      await this.presentToast('Could not push the plan.');
    } finally {
      this.saving.set(false);
    }
  }

  private buildTask(title: string, estimate: number): PlannerTask {
    const lane = this.lane();
    const assignmentKind: PlannerTask['assignment']['kind'] = lane === 'lesson'
      ? 'lesson'
      : lane === 'podcast'
        ? 'podcast'
        : 'none';

    return {
      schema_version: 1,
      lane,
      anchor: false,
      title,
      priority: 'P2',
      status: 'planned',
      estimate_min: Math.max(5, estimate),
      actual_min: null,
      assignment: {
        kind: assignmentKind,
        ar_lesson_id: null,
        unit_id: null,
        topic: null,
        episode_no: null,
        recording_at: null,
      },
      tags: ['plan', lane],
      checklist: [],
      note: this.compilePlan(),
      links: [],
      capture_on_done: {
        create_capture_note: false,
        template: 'quick',
      },
      meta: {
        anchor_key: null,
        week_start: this.weekStart(),
      },
    };
  }

  private compilePlan(): string {
    const blocks: string[] = [];
    const summary = this.summaryControl.value.trim();
    if (summary) {
      blocks.push(summary);
    }
    for (const section of this.sections()) {
      const body = section.body.trim();
      if (body) {
        blocks.push(`## ${section.title}\n${body}`);
      }
    }
    for (const note of this.accordionNotes()) {
      const content = note.content.trim();
      if (content) {
        blocks.push(`### ${note.label}\n${content}`);
      }
    }
    return blocks.join('\n\n');
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const captures = await firstValueFrom(this.notes.list('inbox', 60));
      this.captures.set(captures);
    } catch {
      await this.presentToast('Could not load captures.');
    } finally {
      this.loading.set(false);
    }
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 1500, position: 'bottom' });
    await toast.present();
  }
}

function firstLine(text: string): string {
  return (text ?? '').split('\n').map((line) => line.trim()).find((line) => line && !line.startsWith('#')) ?? '';
}

function quoteLine(text: string): string {
  return (text ?? '')
    .split('\n')
    .filter((line) => line.trim().startsWith('>'))
    .map((line) => line.replace(/^>\s?/, '').trim())
    .join('\n');
}

function sourceLine(text: string): string {
  const match = (text ?? '').split('\n').find((line) => line.trim().toLowerCase().startsWith('source:'));
  return match ? match.replace(/^source:\s?/i, '').trim() : '';
}
