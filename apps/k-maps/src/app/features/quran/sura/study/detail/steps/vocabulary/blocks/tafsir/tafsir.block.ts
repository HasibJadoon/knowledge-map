import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MorphBlockBase } from '../../morph-block-base.directive';
import { TafsirData } from '../../morph-block.types';

@Component({
  selector: 'km-mb-tafsir',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tafsir.block.html',
  styleUrl: './tafsir.block.scss',
})
export class TafsirBlock extends MorphBlockBase {
  get d(): TafsirData { return (this.block.data ?? {}) as TafsirData; }
}
