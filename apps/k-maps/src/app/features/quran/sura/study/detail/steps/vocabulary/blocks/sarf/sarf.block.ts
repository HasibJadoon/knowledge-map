import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MorphBlockBase } from '../../morph-block-base.directive';
import { SarfData } from '../../morph-block.types';

@Component({
  selector: 'km-mb-sarf',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sarf.block.html',
  styleUrl: './sarf.block.scss',
})
export class SarfBlock extends MorphBlockBase {
  get d(): SarfData { return (this.block.data ?? {}) as SarfData; }
}
