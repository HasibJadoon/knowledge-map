import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { MorphBlockBase } from '../../morph-block-base.directive';
import { OccurrencesData } from '../../morph-block.types';

@Component({
  selector: 'km-mb-occurrences',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './occurrences.block.html',
  styleUrl: './occurrences.block.scss',
})
export class OccurrencesBlock extends MorphBlockBase {
  get d(): OccurrencesData { return (this.block.data ?? {}) as OccurrencesData; }
  get items() { return this.block.data?.items ?? []; }
}
