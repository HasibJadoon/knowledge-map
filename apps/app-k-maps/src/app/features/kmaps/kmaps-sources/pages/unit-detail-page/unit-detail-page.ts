import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { KmapsWorkflowShellComponent } from '../../../kmaps-shared/components/workflow-shell/workflow-shell';
import { KmapsUnitWorkspaceTabsComponent } from '../../../kmaps-shared/components/unit-workspace-tabs/unit-workspace-tabs';
import { KmapsNote, KmapsNoteKind, formatNoteKindLabel } from '../../../kmaps-shared/models/kmaps.models';
import { KmapsWorkflowService } from '../../../kmaps-shared/services/kmaps-workflow.service';

type NoteSummaryRow = {
  label: string;
  count: number;
};

@Component({
  selector: 'app-unit-detail-page',
  standalone: true,
  imports: [CommonModule, IonicModule, KmapsWorkflowShellComponent, KmapsUnitWorkspaceTabsComponent],
  templateUrl: './unit-detail-page.html',
  styleUrl: './unit-detail-page.scss',
})
export class UnitDetailPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly workflow = inject(KmapsWorkflowService);

  readonly sourceId = signal('');
  readonly unitId = signal('');
  readonly source = computed(() => this.workflow.getSource(this.sourceId()));
  readonly unit = computed(() => this.workflow.getUnit(this.unitId()));
  readonly scopedNotes = computed(() => this.workflow.getNotesForUnitScope(this.sourceId(), this.unitId()));
  readonly noteSummaryRows = computed<NoteSummaryRow[]>(() => {
    const notes = this.scopedNotes();
    return [
      { label: 'Summary', count: countByKind(notes, 'summary') },
      { label: 'Highlights', count: countByKind(notes, 'highlight') },
      { label: 'Reflections', count: countByKind(notes, 'reflection') },
      { label: 'Questions', count: countByKind(notes, 'question') },
      { label: 'Claim Seeds', count: countByKind(notes, 'claim_seed') },
    ];
  });
  readonly recentNotes = computed(() =>
    this.scopedNotes()
      .filter((note) => note.noteKind !== 'summary')
      .slice(0, 4),
  );
  readonly progressLabel = computed(() => `${this.source()?.progressPercent ?? 0}%`);
  readonly lastOpenedLabel = computed(() => {
    const recent = this.source()?.sourceJson?.['recentLocator'];
    return typeof recent === 'string' && recent.trim() ? recent : this.unit()?.locatorLabel || '';
  });
  readonly heading = computed(() => splitUnitHeading(this.unit()?.title));

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((paramMap) => {
      this.sourceId.set(paramMap.get('sourceId') || '');
      this.unitId.set(paramMap.get('unitId') || '');
    });
  }

  noteCountLabel(row: NoteSummaryRow): string {
    return `${row.count} ${row.count === 1 ? 'Note' : 'Notes'}`;
  }

  noteLabel(note: KmapsNote): string {
    return formatNoteKindLabel(note.noteKind);
  }
}

function splitUnitHeading(title: string | null | undefined): { title: string; subtitle: string } {
  const value = (title || '').trim();
  if (!value) {
    return { title: 'Chapter', subtitle: '' };
  }

  const [left, ...rest] = value.split('·').map((part) => part.trim()).filter(Boolean);
  return {
    title: left || value,
    subtitle: rest.join(' · '),
  };
}

function countByKind(notes: KmapsNote[], kind: KmapsNoteKind): number {
  return notes.filter((note) => note.noteKind === kind).length;
}
