import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { KmapsUnitBottomTabsComponent } from '../../../kmaps-shared/components/unit-bottom-tabs/unit-bottom-tabs';
import { KmapsPageHeaderComponent } from '../../../kmaps-shared/components/page-header/page-header';
import { KmapsConcept, KmapsNote, formatNoteKindLabel } from '../../../kmaps-shared/models/kmaps.models';
import { KmapsWorkflowService } from '../../../../../shared/services/kmaps-workflow.service';

@Component({
  selector: 'app-concept-detail-page',
  standalone: true,
  imports: [CommonModule, IonicModule, KmapsPageHeaderComponent, KmapsUnitBottomTabsComponent],
  templateUrl: './concept-detail-page.html',
  styleUrl: './concept-detail-page.scss',
})
export class ConceptDetailPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly workflow = inject(KmapsWorkflowService);

  readonly sourceId = signal('');
  readonly unitId = signal('');
  readonly conceptId = signal('');
  readonly conceptQuery = signal('');

  readonly unit = computed(() => this.workflow.getUnit(this.unitId()));
  readonly contextConcepts = computed(() => {
    if (this.sourceId() && this.unitId()) {
      return this.workflow.getConceptsForContext(this.sourceId(), this.unitId());
    }

    const currentConcept = this.workflow.getConcept(this.conceptId());
    if (!currentConcept) {
      return [];
    }

    const related = this.workflow.getRelatedConcepts(currentConcept.id);
    return [currentConcept, ...related.filter((concept) => concept.id !== currentConcept.id)];
  });
  readonly filteredConcepts = computed(() => {
    const query = this.conceptQuery().trim().toLowerCase();
    if (!query) {
      return this.contextConcepts();
    }

    return this.contextConcepts().filter((concept) => {
      const haystack = `${concept.label} ${concept.summary} ${concept.slug}`.toLowerCase();
      return haystack.includes(query);
    });
  });
  readonly activeConceptId = computed(() => {
    const currentId = this.conceptId();
    if (currentId) {
      return currentId;
    }

    return this.filteredConcepts()[0]?.id || this.contextConcepts()[0]?.id || '';
  });
  readonly currentConcept = computed(() => this.workflow.getConcept(this.activeConceptId()));
  readonly visibleNotes = computed(() => {
    const concept = this.currentConcept();
    if (!concept) {
      return [];
    }

    if (this.sourceId() && this.unitId()) {
      return this.workflow.getNotesForConceptInContext(concept.id, this.sourceId(), this.unitId());
    }

    return this.workflow.getRelatedNotesForConcept(concept.id);
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((paramMap) => {
      this.sourceId.set(paramMap.get('sourceId') || '');
      this.unitId.set(paramMap.get('unitId') || '');
      this.conceptId.set(paramMap.get('conceptId') || '');
      this.conceptQuery.set('');
    });
  }

  updateConceptQuery(value: string | null | undefined): void {
    this.conceptQuery.set((value || '').replace(/^\s+/, ''));
  }

  selectConcept(conceptId: string): void {
    this.conceptId.set(conceptId);
  }

  noteLabel(note: KmapsNote): string {
    return formatNoteKindLabel(note.noteKind);
  }

  trackConcept(_: number, concept: KmapsConcept): string {
    return concept.id;
  }

  trackNote(_: number, note: KmapsNote): string {
    return note.id;
  }
}
