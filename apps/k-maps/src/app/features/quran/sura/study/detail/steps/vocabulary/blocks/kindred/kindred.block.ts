import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MorphBlockBase } from '../../morph-block-base.directive';
import { KindredData } from '../../morph-block.types';

@Component({
  selector: 'km-mb-kindred',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './kindred.block.html',
  styleUrl: './kindred.block.scss',
})
export class KindredBlock extends MorphBlockBase {
  get d(): KindredData { return (this.block.data ?? {}) as KindredData; }
}
