import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  QueryList,
  SimpleChanges,
  ViewChildren,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranscriptLine } from '../../reaction.models';

@Component({
  selector: 'km-transcript-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './transcript-panel.component.html',
  styleUrl: './transcript-panel.component.css',
})
export class TranscriptPanelComponent implements OnChanges {
  @Input({ required: true }) lines: TranscriptLine[] = [];
  @Input() activeLineId: string | null = null;
  @Output() seekRequest = new EventEmitter<number>();

  @ViewChildren('lineEl') lineElements!: QueryList<ElementRef<HTMLElement>>;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['activeLineId'] && this.activeLineId) {
      // Defer to next tick so the DOM has been updated
      setTimeout(() => this.scrollActiveIntoView(), 0);
    }
  }

  private scrollActiveIntoView(): void {
    if (!this.lineElements) return;
    const target = this.lineElements.find(
      (ref) => ref.nativeElement.dataset['lineId'] === this.activeLineId
    );
    target?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  seekToLine(line: TranscriptLine): void {
    this.seekRequest.emit(line.start);
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
