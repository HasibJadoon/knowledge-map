import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { KmapsWorkflowShellComponent } from '../../../kmaps-shared/components/workflow-shell/workflow-shell';
import { KmapsWorkflowService } from '../../../kmaps-shared/services/kmaps-workflow.service';

@Component({
  selector: 'app-reader-page',
  standalone: true,
  imports: [CommonModule, IonicModule, KmapsWorkflowShellComponent],
  templateUrl: './reader-page.html',
  styleUrl: './reader-page.scss',
})
export class ReaderPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workflow = inject(KmapsWorkflowService);

  readonly sourceId = signal('');
  readonly unitId = signal('');
  readonly selectedParagraphIndex = signal<number | null>(null);
  readonly source = computed(() => this.workflow.getSource(this.sourceId()));
  readonly unit = computed(() => this.workflow.getUnit(this.unitId()));
  readonly selectedExcerpt = computed(() => {
    const unit = this.unit();
    const index = this.selectedParagraphIndex();

    if (!unit || index == null) {
      return '';
    }

    return unit.readingBody[index] || '';
  });

  readonly selectedLocator = computed(() => {
    const unit = this.unit();
    const index = this.selectedParagraphIndex();

    if (!unit) {
      return '';
    }

    if (index == null) {
      return unit.locatorLabel || unit.startRef || '';
    }

    return `${unit.locatorLabel || unit.startRef || ''} · ¶${index + 1}`;
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((paramMap) => {
      this.sourceId.set(paramMap.get('sourceId') || '');
      this.unitId.set(paramMap.get('unitId') || '');
      this.selectedParagraphIndex.set(null);
    });
  }

  selectParagraph(index: number): void {
    this.selectedParagraphIndex.update((current) => (current === index ? null : index));
  }

  openQuickCapture(): void {
    if (!this.selectedExcerpt()) {
      return;
    }

    void this.router.navigate(
      ['/worldview', 'sources', this.sourceId(), 'units', this.unitId(), 'capture'],
      {
        queryParams: {
          excerpt: this.selectedExcerpt(),
          locator: this.selectedLocator(),
        },
      },
    );
  }

  openNotes(): void {
    void this.router.navigate(['/worldview', 'sources', this.sourceId(), 'units', this.unitId(), 'notes']);
  }
}
