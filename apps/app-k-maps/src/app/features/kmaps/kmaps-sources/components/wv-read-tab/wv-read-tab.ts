import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { KmapsEmptyStateCardComponent } from '../../../kmaps-shared/components/empty-state-card/empty-state-card';
import { KmapsSourceUnit } from '../../../kmaps-shared/models/kmaps.models';

type ReadingSegment = {
  index: number;
  locator: string;
  marker: string | null;
  body: string;
};

type ReadingSelection = {
  excerpt: string;
  locator: string;
};

type ReadingContextRequest = {
  event: MouseEvent;
  mode: 'selection' | 'segment';
  index?: number;
  excerpt?: string;
  locator?: string;
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
  @ViewChild('passageRoot') private readonly passageRoot?: ElementRef<HTMLElement>;
  private lastSyntheticContextKey = '';
  private lastSyntheticContextAt = 0;

  @Input() readUnits: ReadonlyArray<KmapsSourceUnit> = [];
  @Input() selectedReadUnit: KmapsSourceUnit | null = null;
  @Input() displayedSegments: ReadonlyArray<ReadingSegment> = [];
  @Input() selectedSegmentIndexes: ReadonlyArray<number> = [];
  @Input() selectedExcerpt = '';
  @Input() selectedLocator = '';
  @Input() normalizedQuery = '';

  @Output() scopeSelected = new EventEmitter<string>();
  @Output() selectionChanged = new EventEmitter<ReadingSelection>();
  @Output() segmentToggleRequested = new EventEmitter<number>();
  @Output() contextMenuRequested = new EventEmitter<ReadingContextRequest>();
  @Output() highlightRequested = new EventEmitter<void>();
  @Output() noteRequested = new EventEmitter<void>();
  @Output() copyRequested = new EventEmitter<void>();
  @Output() linkNodeRequested = new EventEmitter<void>();
  @Output() backToOverview = new EventEmitter<void>();

  trackUnit(_: number, unit: KmapsSourceUnit): string {
    return unit.id;
  }

  trackSegment(_: number, segment: ReadingSegment): string {
    return `${segment.index}:${segment.locator}`;
  }

  isArabicText(value: string | null | undefined): boolean {
    return looksArabic(value || '');
  }

  isMostlyArabic(): boolean {
    return this.displayedSegments.some((segment) => this.isArabicText(segment.body));
  }

  shouldRenderMarker(segment: ReadingSegment): boolean {
    return !!segment.marker && !this.isArabicText(segment.body);
  }

  isSegmentSelected(index: number): boolean {
    return this.selectedSegmentIndexes.includes(index);
  }

  onSegmentClick(index: number): void {
    if (this.hasActiveTextSelection()) {
      return;
    }

    this.segmentToggleRequested.emit(index);
  }

  onPassageContextMenu(event: MouseEvent): void {
    if (this.shouldIgnoreSyntheticContextMenu(event, 'selection')) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    const selection = this.readCurrentSelection();
    if (!selection) {
      return;
    }

    this.emitSelection(selection.excerpt, selection.locator);
    this.contextMenuRequested.emit({
      event,
      mode: 'selection',
      excerpt: selection.excerpt,
      locator: selection.locator,
    });
  }

  onPassageMouseDown(event: MouseEvent): void {
    if (!this.isContextMenuGesture(event)) {
      return;
    }

    event.preventDefault();
    this.openSelectionMenuFromPointer(event);
  }

  onSegmentContextMenu(event: MouseEvent, index: number): void {
    if (this.shouldIgnoreSyntheticContextMenu(event, `segment:${index}`) || this.shouldIgnoreSyntheticContextMenu(event, 'selection')) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const selection = this.readCurrentSelection();
    if (selection) {
      this.emitSelection(selection.excerpt, selection.locator);
      this.contextMenuRequested.emit({
        event,
        mode: 'selection',
        excerpt: selection.excerpt,
        locator: selection.locator,
      });
      return;
    }

    this.contextMenuRequested.emit({
      event,
      mode: 'segment',
      index,
    });
  }

  onSegmentMouseDown(event: MouseEvent, index: number): void {
    if (!this.isContextMenuGesture(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    queueMicrotask(() => {
      const selection = this.readCurrentSelection();
      if (selection) {
        this.markSyntheticContextMenu(event, 'selection');
        this.emitSelection(selection.excerpt, selection.locator);
        this.contextMenuRequested.emit({
          event,
          mode: 'selection',
          excerpt: selection.excerpt,
          locator: selection.locator,
        });
        return;
      }

      this.markSyntheticContextMenu(event, `segment:${index}`);
      this.contextMenuRequested.emit({
        event,
        mode: 'segment',
        index,
      });
    });
  }

  captureSelection(): void {
    queueMicrotask(() => {
      const selection = this.readCurrentSelection();
      if (!selection) {
        return;
      }

      this.emitSelection(selection.excerpt, selection.locator);
    });
  }

  private resolveSegmentIndex(node: Node | null): number | null {
    const root = this.passageRoot?.nativeElement;
    if (!root || !node) {
      return null;
    }

    const element = node instanceof HTMLElement ? node : node.parentElement;
    const segment = element?.closest<HTMLElement>('[data-segment-index]');
    if (!segment || !root.contains(segment)) {
      return null;
    }

    const value = Number(segment.dataset['segmentIndex']);
    return Number.isFinite(value) ? value : null;
  }

  private composeLocator(startIndex: number | null, endIndex: number | null): string {
    if (startIndex == null || endIndex == null || !this.displayedSegments.length) {
      return this.selectedReadUnit?.locatorLabel || this.selectedReadUnit?.startRef || '';
    }

    const lower = Math.min(startIndex, endIndex);
    const upper = Math.max(startIndex, endIndex);
    const first = this.displayedSegments.find((segment) => segment.index === lower);
    const last = this.displayedSegments.find((segment) => segment.index === upper);

    if (!first) {
      return this.selectedReadUnit?.locatorLabel || this.selectedReadUnit?.startRef || '';
    }

    if (!last || first.index === last.index) {
      return first.locator;
    }

    const compact = compactLocatorRange(first.locator, last.locator);
    return compact || this.selectedReadUnit?.locatorLabel || first.locator;
  }

  private emitSelection(excerpt: string, locator: string): void {
    this.selectionChanged.emit({ excerpt, locator });
  }

  private openSelectionMenuFromPointer(event: MouseEvent): void {
    queueMicrotask(() => {
      this.markSyntheticContextMenu(event, 'selection');
      const selection = this.readCurrentSelection();
      if (!selection) {
        return;
      }

      this.emitSelection(selection.excerpt, selection.locator);
      this.contextMenuRequested.emit({
        event,
        mode: 'selection',
        excerpt: selection.excerpt,
        locator: selection.locator,
      });
    });
  }

  private isContextMenuGesture(event: MouseEvent): boolean {
    return event.button === 2 || (event.ctrlKey && event.button === 0);
  }

  private markSyntheticContextMenu(event: MouseEvent, key: string): void {
    this.lastSyntheticContextKey = `${key}:${event.clientX}:${event.clientY}`;
    this.lastSyntheticContextAt = Date.now();
  }

  private shouldIgnoreSyntheticContextMenu(event: MouseEvent, key: string): boolean {
    if (!this.lastSyntheticContextKey) {
      return false;
    }

    const matches = this.lastSyntheticContextKey === `${key}:${event.clientX}:${event.clientY}`;
    const fresh = Date.now() - this.lastSyntheticContextAt < 400;
    if (!matches || !fresh) {
      return false;
    }

    this.lastSyntheticContextKey = '';
    this.lastSyntheticContextAt = 0;
    return true;
  }

  private readCurrentSelection(): ReadingSelection | null {
    const root = this.passageRoot?.nativeElement;
    const selection = typeof window !== 'undefined' ? window.getSelection() : null;
    const excerpt = selection?.toString().trim() || '';
    if (!root || !selection || !excerpt || selection.rangeCount < 1) {
      return null;
    }

    const range = selection.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) {
      return null;
    }

    const startIndex = this.resolveSegmentIndex(range.startContainer);
    const endIndex = this.resolveSegmentIndex(range.endContainer);
    return {
      excerpt,
      locator: this.composeLocator(startIndex, endIndex),
    };
  }

  private hasActiveTextSelection(): boolean {
    return !!this.readCurrentSelection();
  }
}

function compactLocatorRange(startLocator: string, endLocator: string): string | null {
  const startMatch = startLocator.match(/^(.*?)(\d+)$/);
  const endMatch = endLocator.match(/^(.*?)(\d+)$/);
  if (!startMatch || !endMatch || startMatch[1] !== endMatch[1]) {
    return null;
  }

  return `${startMatch[1]}${startMatch[2]}-${endMatch[2]}`;
}

function looksArabic(value: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(value);
}
