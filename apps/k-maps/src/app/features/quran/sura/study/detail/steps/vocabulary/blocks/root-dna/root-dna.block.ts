import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MorphBlockBase } from '../../morph-block-base.directive';
import { RootDnaData } from '../../morph-block.types';

@Component({
  selector: 'km-mb-root-dna',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './root-dna.block.html',
  styleUrl: './root-dna.block.scss',
})
export class RootDnaBlock extends MorphBlockBase {
  get d(): RootDnaData { return (this.block.data ?? {}) as RootDnaData; }
}
