import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { MorphBlockBase } from '../../morph-block-base.directive';
import { MasterStoryData } from '../../morph-block.types';

@Component({
  selector: 'km-mb-master-story',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './master-story.block.html',
  styleUrl: './master-story.block.scss',
})
export class MasterStoryBlock extends MorphBlockBase {
  get d(): MasterStoryData { return (this.block.data ?? {}) as MasterStoryData; }

}
