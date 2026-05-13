import {
  ChangeDetectionStrategy, Component, EventEmitter, Output, input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type {
  LisanReadView, LisanParagraph, LisanProseToken,
} from '../../../shared/services/al-dictionary-api.service';

@Component({
  selector: 'km-lexicon-reader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lexicon-reader.component.html',
  styleUrl: './lexicon-reader.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LexiconReaderComponent {
  view = input.required<LisanReadView>();

  @Output() openAyahEvent     = new EventEmitter<{ surah: number; ayah: number }>();
  @Output() openFootnoteEvent = new EventEmitter<{ num: number }>();
  @Output() openAuthorityEvent = new EventEmitter<{ name: string }>();

  trackParagraph = (i: number, _p: LisanParagraph) => i;
  trackToken     = (i: number, _t: LisanProseToken) => i;

  fnTooltip(t: Extract<LisanProseToken, { kind: 'footnote' }>): string {
    const pivot = t.pivot ? ` — ${t.pivot}` : '';
    if (t.text) return `حاشية ${t.num}${pivot}: ${t.text}`;
    return `حاشية ${t.num}${pivot} (لا يوجد نص)`;
  }

  onQuranClick(t: Extract<LisanProseToken, { kind: 'quran' }>) {
    if (t.surah && t.ayah) this.openAyahEvent.emit({ surah: t.surah, ayah: t.ayah });
  }
  onFootnoteClick(t: Extract<LisanProseToken, { kind: 'footnote' }>) {
    this.openFootnoteEvent.emit({ num: t.num });
  }
  onAuthorityClick(t: Extract<LisanProseToken, { kind: 'authority' }>) {
    this.openAuthorityEvent.emit({ name: t.name });
  }
}
