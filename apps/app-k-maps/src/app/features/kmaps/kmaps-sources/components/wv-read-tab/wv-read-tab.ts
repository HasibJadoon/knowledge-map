import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { KmapsEmptyStateCardComponent } from '../../../kmaps-shared/components/empty-state-card/empty-state-card';
import { KmapsSourceUnit } from '../../../kmaps-shared/models/kmaps.models';

type ReadingParagraph = {
  index: number;
  body: string;
};

type ReadingSection = {
  heading: string;
  paragraphs: ReadingParagraph[];
};

@Component({
  selector: 'app-wv-read-tab',
  standalone: true,
  imports: [CommonModule, IonicModule, KmapsEmptyStateCardComponent],
  templateUrl: './wv-read-tab.html',
  styleUrl: './wv-read-tab.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WvReadTabComponent {
  @Input() readUnits: ReadonlyArray<KmapsSourceUnit> = [];
  @Input() selectedReadUnit: KmapsSourceUnit | null = null;
  @Input() displayedSections: ReadonlyArray<ReadingSection> = [];
  @Input() selectedParagraphIndex: number | null = null;
  @Input() selectedExcerpt = '';
  @Input() selectedLocator = '';
  @Input() normalizedQuery = '';

  @Output() scopeSelected = new EventEmitter<string>();
  @Output() paragraphSelected = new EventEmitter<number>();
  @Output() paragraphMenuRequested = new EventEmitter<number>();
  @Output() highlightRequested = new EventEmitter<void>();
  @Output() noteRequested = new EventEmitter<void>();
  @Output() copyRequested = new EventEmitter<void>();
  @Output() linkNodeRequested = new EventEmitter<void>();
  @Output() backToOverview = new EventEmitter<void>();

  private holdTimer: ReturnType<typeof setTimeout> | null = null;
  private longPressActive = false;

  trackUnit(_: number, unit: KmapsSourceUnit): string {
    return unit.id;
  }

  trackSection(_: number, section: ReadingSection): string {
    return section.heading;
  }

  onParagraphPressStart(index: number): void {
    this.clearHoldTimer();
    this.longPressActive = false;
    this.holdTimer = setTimeout(() => {
      this.longPressActive = true;
      this.paragraphMenuRequested.emit(index);
    }, 420);
  }

  onParagraphPressEnd(): void {
    this.clearHoldTimer();
  }

  onParagraphClick(index: number): void {
    if (this.longPressActive) {
      this.longPressActive = false;
      return;
    }

    this.paragraphSelected.emit(index);
  }

  onParagraphContextMenu(event: Event, index: number): void {
    event.preventDefault();
    this.paragraphMenuRequested.emit(index);
  }

  private clearHoldTimer(): void {
    if (this.holdTimer) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
  }
}
