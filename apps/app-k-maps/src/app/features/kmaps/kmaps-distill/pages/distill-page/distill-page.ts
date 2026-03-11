import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { KmapsWorkflowShellComponent } from '../../../kmaps-shared/components/workflow-shell/workflow-shell';
import { KmapsUnitWorkspaceTabsComponent } from '../../../kmaps-shared/components/unit-workspace-tabs/unit-workspace-tabs';
import { KmapsNote, formatNoteKindLabel } from '../../../kmaps-shared/models/kmaps.models';
import { KmapsWorkflowService } from '../../../kmaps-shared/services/kmaps-workflow.service';

type DistillFilter = 'all' | 'highlight' | 'reflection' | 'claim_seed';

@Component({
  selector: 'app-distill-page',
  standalone: true,
  imports: [CommonModule, IonicModule, KmapsWorkflowShellComponent, KmapsUnitWorkspaceTabsComponent],
  templateUrl: './distill-page.html',
  styleUrl: './distill-page.scss',
})
export class DistillPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly workflow = inject(KmapsWorkflowService);

  readonly sourceId = signal('');
  readonly unitId = signal('');
  readonly activeFilter = signal<DistillFilter>('all');
  readonly selectedNoteIds = signal<string[]>([]);

  readonly unit = computed(() => this.workflow.getUnit(this.unitId()));
  readonly notes = computed(() => this.workflow.getNotesForUnitScope(this.sourceId(), this.unitId()));
  readonly filteredNotes = computed(() => {
    if (this.activeFilter() === 'all') {
      return this.notes();
    }

    return this.notes().filter((note) => note.noteKind === this.activeFilter());
  });
  readonly heading = computed(() => splitUnitHeading(this.unit()?.title));

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((paramMap) => {
      this.sourceId.set(paramMap.get('sourceId') || '');
      this.unitId.set(paramMap.get('unitId') || '');
      this.selectedNoteIds.set([]);
      this.activeFilter.set('all');
    });
  }

  setFilter(value: string | number | null | undefined): void {
    const nextValue = value === 'highlight' || value === 'reflection' || value === 'claim_seed' ? value : 'all';
    this.activeFilter.set(nextValue);
  }

  toggleNoteSelection(noteId: string): void {
    this.selectedNoteIds.update((current) =>
      current.includes(noteId) ? current.filter((id) => id !== noteId) : [...current, noteId],
    );
  }

  isSelected(noteId: string): boolean {
    return this.selectedNoteIds().includes(noteId);
  }

  noteLabel(note: KmapsNote): string {
    return formatNoteKindLabel(note.noteKind);
  }
}

function splitUnitHeading(title: string | null | undefined): { title: string; subtitle: string } {
  const value = (title || '').trim();
  if (!value) {
    return { title: 'Distill', subtitle: '' };
  }

  const [left, ...rest] = value.split('·').map((part) => part.trim()).filter(Boolean);
  return {
    title: left || value,
    subtitle: rest.join(' · '),
  };
}
