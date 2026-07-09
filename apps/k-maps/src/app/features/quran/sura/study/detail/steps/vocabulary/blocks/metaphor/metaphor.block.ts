import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MorphBlockBase } from '../../morph-block-base.directive';
import { MetaphorData } from '../../morph-block.types';

@Component({
  selector: 'km-mb-metaphor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './metaphor.block.html',
  styleUrl: './metaphor.block.scss',
})
export class MetaphorBlock extends MorphBlockBase {
  get d(): MetaphorData { return (this.block.data ?? {}) as MetaphorData; }
}
