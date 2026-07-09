import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MorphBlockBase } from '../../morph-block-base.directive';
import { LexiconData } from '../../morph-block.types';

@Component({
  selector: 'km-mb-lexicon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lexicon.block.html',
  styleUrl: './lexicon.block.scss',
})
export class LexiconBlock extends MorphBlockBase {
  get d(): LexiconData { return (this.block.data ?? {}) as LexiconData; }
}
