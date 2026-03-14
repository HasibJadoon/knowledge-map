import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';

import { KmapsUnitBottomTabsComponent } from '../../../kmaps-shared/components/unit-bottom-tabs/unit-bottom-tabs';
import { KmapsPageHeaderComponent } from '../../../kmaps-shared/components/page-header/page-header';
import { KmapsWorkflowService } from '../../../kmaps-shared/services/kmaps-workflow.service';

type HighlightTone = 'yellow' | 'blue' | 'purple' | 'green';

type ReadingSection = {
  heading: string;
  paragraphs: Array<{ index: number; body: string }>;
};

@Component({
  selector: 'app-reader-page',
  standalone: true,
  imports: [CommonModule, IonicModule, KmapsPageHeaderComponent, KmapsUnitBottomTabsComponent],
  templateUrl: './reader-page.html',
  styleUrl: './reader-page.scss',
})
export class ReaderPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);
  private readonly workflow = inject(KmapsWorkflowService);

  readonly sourceId = signal('');
  readonly unitId = signal('');
  readonly selectedParagraphIndex = signal<number | null>(null);
  readonly highlightTone = signal<HighlightTone>('yellow');
  readonly highlightTones: ReadonlyArray<HighlightTone> = ['yellow', 'blue', 'purple', 'green'];
  readonly markedParagraphs = signal<number[]>([]);
  readonly source = computed(() => this.workflow.getSource(this.sourceId()));
  readonly unit = computed(() => this.workflow.getUnit(this.unitId()));
  readonly progressPercent = computed(() => clampPercent(this.source()?.progressPercent ?? 0));
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
  readonly readingSections = computed<ReadingSection[]>(() => buildReadingSections(this.unit()?.readingBody || []));

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((paramMap) => {
      this.sourceId.set(paramMap.get('sourceId') || '');
      this.unitId.set(paramMap.get('unitId') || '');
      this.selectedParagraphIndex.set(null);
      this.markedParagraphs.set([]);
    });
  }

  selectParagraph(index: number): void {
    this.selectedParagraphIndex.update((current) => (current === index ? null : index));
  }

  async highlightSelected(): Promise<void> {
    const excerpt = this.selectedExcerpt().trim();
    if (!excerpt) {
      return;
    }

    this.workflow.addNote({
      sourceId: this.sourceId(),
      sourceUnitId: this.unitId(),
      noteKind: 'highlight',
      title: `Highlight · ${this.highlightTone()}`,
      bodyMd: excerpt,
      excerptText: excerpt,
      locator: this.selectedLocator(),
    });

    await this.presentToast('Highlight saved.');
  }

  openQuickCapture(): void {
    const excerpt = this.selectedExcerpt();

    void this.router.navigate(['/worldview', 'sources', this.sourceId(), 'units', this.unitId(), 'capture'], {
      queryParams: {
        excerpt: excerpt || null,
        locator: this.selectedLocator() || null,
      },
    });
  }

  toggleMarker(): void {
    const index = this.selectedParagraphIndex();
    if (index == null) {
      return;
    }

    this.markedParagraphs.update((current) =>
      current.includes(index) ? current.filter((value) => value !== index) : [...current, index].sort((left, right) => left - right),
    );
  }

  jumpToMarker(): void {
    const markers = this.markedParagraphs();
    if (!markers.length) {
      this.selectedParagraphIndex.set(0);
      return;
    }

    this.selectedParagraphIndex.set(markers[markers.length - 1]);
  }

  async createQuoteNode(): Promise<void> {
    const excerpt = this.selectedExcerpt().trim();
    if (!excerpt) {
      return;
    }

    this.workflow.addNote({
      sourceId: this.sourceId(),
      sourceUnitId: this.unitId(),
      noteKind: 'quote',
      title: 'Quote node seed',
      bodyMd: excerpt,
      excerptText: excerpt,
      locator: this.selectedLocator(),
    });

    await this.presentToast('Quote node seed created.');
  }

  sendToDistill(): void {
    void this.router.navigate(['/worldview', 'sources', this.sourceId(), 'units', this.unitId(), 'distill']);
  }

  async copyExcerpt(): Promise<void> {
    const excerpt = this.selectedExcerpt().trim();
    if (!excerpt) {
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(excerpt);
      await this.presentToast('Copied to clipboard.');
      return;
    }

    await this.presentToast('Clipboard is not available here.');
  }

  linkToNode(): void {
    void this.router.navigate(['/worldview', 'sources', this.sourceId(), 'units', this.unitId(), 'concepts']);
  }

  setHighlightTone(tone: HighlightTone): void {
    this.highlightTone.set(tone);
  }

  isMarked(index: number): boolean {
    return this.markedParagraphs().includes(index);
  }

  trackSection(_: number, section: ReadingSection): string {
    return section.heading;
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 1400,
      position: 'bottom',
    });

    await toast.present();
  }
}

function buildReadingSections(paragraphs: string[]): ReadingSection[] {
  if (paragraphs.length <= 2) {
    return [
      {
        heading: 'The Path to Awareness',
        paragraphs: paragraphs.map((body, index) => ({ index, body })),
      },
    ];
  }

  const pivot = Math.ceil(paragraphs.length / 2);
  return [
    {
      heading: 'The Path to Awareness',
      paragraphs: paragraphs.slice(0, pivot).map((body, index) => ({ index, body })),
    },
    {
      heading: 'Layers of the Inner Self',
      paragraphs: paragraphs.slice(pivot).map((body, index) => ({ index: index + pivot, body })),
    },
  ];
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}
