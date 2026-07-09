import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MorphBlockBase } from '../../morph-block-base.directive';
import { IrabData } from '../../morph-block.types';

@Component({
  selector: 'km-mb-irab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './irab.block.html',
  styleUrl: './irab.block.scss',
})
export class IrabBlock extends MorphBlockBase {
  get d(): IrabData { return (this.block.data ?? {}) as IrabData; }
}
