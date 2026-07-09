import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MorphBlockBase } from '../../morph-block-base.directive';
import { TranslatorsData } from '../../morph-block.types';

// translator reading tag → colour
const READING: Record<string, { fg: string; bd: string }> = {
  partial:   { fg: '#93b8d6', bd: 'rgba(147,184,214,.4)' },
  causative: { fg: '#e8c96a', bd: 'rgba(201,168,76,.4)' },
  both:      { fg: '#b3a6f6', bd: 'rgba(136,120,226,.4)' },
};

@Component({
  selector: 'km-mb-translators',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './translators.block.html',
  styleUrl: './translators.block.scss',
})
export class TranslatorsBlock extends MorphBlockBase {
  get d(): TranslatorsData { return (this.block.data ?? {}) as TranslatorsData; }

  /** translator renderings with reading-tag colours. */
  renderings(): any[] {
    return (this.d.renderings ?? []).map((r: any) => {
      const tag = (r.reading || 'partial').toLowerCase();
      const c = READING[tag] ?? READING['partial'];
      const isArTag = /[\u0600-\u06ff]/.test(r.reading || '');
      return { ...r, reading: isArTag ? (r.reading || '') : (r.reading || '').toUpperCase(), fg: c.fg, bd: c.bd };
    });
  }
}
