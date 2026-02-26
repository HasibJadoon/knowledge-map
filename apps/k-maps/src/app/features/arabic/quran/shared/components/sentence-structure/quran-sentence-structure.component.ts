import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

export interface QuranSentenceStructureSegment {
  component: string;
  text: string;
  pattern: string;
  role: string;
  grammar: string[];
}

export interface QuranSentenceStructureSummary {
  full_text: string;
  main_components: QuranSentenceStructureSegment[];
  expansions: QuranSentenceStructureSegment[];
}

export interface QuranSentenceStructureSentence {
  sentence_order: number;
  structure_summary: QuranSentenceStructureSummary;
}

@Component({
  selector: 'app-quran-sentence-structure',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quran-sentence-structure.component.html',
  styleUrls: ['./quran-sentence-structure.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuranSentenceStructureComponent implements OnChanges {
  @Input() sentences: ReadonlyArray<QuranSentenceStructureSentence> = [];

  @ViewChild('sentenceRegion')
  private sentenceRegionRef?: ElementRef<HTMLElement>;

  activeSentenceIndex = 0;
  activeSegmentIndex: number | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['sentences']) return;

    if (!this.sentences.length) {
      this.activeSentenceIndex = 0;
      this.activeSegmentIndex = null;
      return;
    }

    const maxIndex = this.sentences.length - 1;
    if (this.activeSentenceIndex > maxIndex) {
      this.activeSentenceIndex = maxIndex;
    }
    if (this.activeSentenceIndex < 0) {
      this.activeSentenceIndex = 0;
    }

    if (this.activeSegmentIndex != null && !this.currentSentenceSegments[this.activeSegmentIndex]) {
      this.activeSegmentIndex = null;
    }
  }

  get hasSentences(): boolean {
    return this.sentences.length > 0;
  }

  get currentSentence(): QuranSentenceStructureSentence | null {
    return this.sentences[this.activeSentenceIndex] ?? null;
  }

  get currentSentenceSegments(): ReadonlyArray<QuranSentenceStructureSegment> {
    return this.currentSentence?.structure_summary.main_components ?? [];
  }

  get activeSegment(): QuranSentenceStructureSegment | null {
    if (this.activeSegmentIndex == null) return null;
    return this.currentSentenceSegments[this.activeSegmentIndex] ?? null;
  }

  get canGoPrev(): boolean {
    return this.activeSentenceIndex > 0;
  }

  get canGoNext(): boolean {
    return this.activeSentenceIndex < this.sentences.length - 1;
  }

  prevSentence(): void {
    if (!this.canGoPrev) return;
    this.activeSentenceIndex -= 1;
    this.activeSegmentIndex = null;
  }

  nextSentence(): void {
    if (!this.canGoNext) return;
    this.activeSentenceIndex += 1;
    this.activeSegmentIndex = null;
  }

  toggleSegment(index: number): void {
    if (!this.currentSentenceSegments[index]) return;
    this.activeSegmentIndex = this.activeSegmentIndex === index ? null : index;
  }

  onSegmentKeydown(event: KeyboardEvent, index: number): void {
    if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
    event.preventDefault();
    this.toggleSegment(index);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.activeSegmentIndex == null) return;
    const sentenceRegion = this.sentenceRegionRef?.nativeElement;
    if (!sentenceRegion) return;
    if (!(event.target instanceof Node)) return;
    if (!sentenceRegion.contains(event.target)) {
      this.activeSegmentIndex = null;
    }
  }

  trackBySegment(index: number, segment: QuranSentenceStructureSegment): string {
    return `${index}-${segment.component}-${segment.text}`;
  }

  trackByGrammar(index: number, value: string): string {
    return `${index}-${value}`;
  }
}
