import {
  ChangeDetectionStrategy, Component, computed, EventEmitter, Output, input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type {
  MufradatReadView, MufradatParagraph, MufradatProseToken,
} from '../../../shared/services/al-dictionary-api.service';

@Component({
  selector: 'km-mufradat-reader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mufradat-reader.component.html',
  styleUrl: './mufradat-reader.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MufradatReaderComponent {
  view = input.required<MufradatReadView>();

  @Output() openAyahEvent = new EventEmitter<{ surah: number; ayah: number }>();
  @Output() openFootnoteEvent = new EventEmitter<{
    num: number; printed_page: number | null;
  }>();

  trackParagraph = (i: number, _p: MufradatParagraph) => i;
  trackToken = (i: number, _t: MufradatProseToken) => i;

  fnTooltip(t: Extract<MufradatProseToken, { kind: 'footnote' }>): string {
    if (t.text) {
      const pageHint = t.printed_page ? ` (ص ${t.printed_page})` : '';
      return `حاشية ${t.num}${pageHint}: ${t.text}`;
    }
    return `حاشية ${t.num} (لا يوجد نص)`;
  }

  onQuranClick(t: Extract<MufradatProseToken, { kind: 'quran' }>) {
    if (t.surah_num && t.ayah) {
      this.openAyahEvent.emit({ surah: t.surah_num, ayah: t.ayah });
    }
  }

  onFootnoteClick(t: Extract<MufradatProseToken, { kind: 'footnote' }>) {
    this.openFootnoteEvent.emit({ num: t.num, printed_page: t.printed_page });
  }
}
