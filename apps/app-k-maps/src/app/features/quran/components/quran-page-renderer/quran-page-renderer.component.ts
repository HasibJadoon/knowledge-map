import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import {
  QuranReaderLayoutSlotViewModel,
  QuranReaderPageViewModel,
} from '../../models/quran-reader-view.model';

@Component({
  selector: 'app-quran-page-renderer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quran-page-renderer.component.html',
  styleUrl: './quran-page-renderer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuranPageRendererComponent {
  @Input({ required: true }) page!: QuranReaderPageViewModel;

  trackBySlot(_: number, slot: QuranReaderLayoutSlotViewModel): number {
    return slot.slot;
  }

  trackByFallbackVerse(_: number, verse: { id: number }): number {
    return verse.id;
  }
}
