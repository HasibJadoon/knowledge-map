import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MorphContextVm } from '../../../../../../../../../shared/services/quran/quran-surah.service';

/**
 * Presentational context switcher for the Morph Display Layer — one card per
 * Qurʾānic occurrence of the word. Pure renderer; emits the chosen ayah_key.
 */
@Component({
  selector: 'km-morph-context-switcher',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './morph-context-switcher.component.html',
  styleUrl: './morph-context-switcher.component.scss',
})
export class MorphContextSwitcherComponent {
  @Input() contexts: MorphContextVm[] = [];
  @Input() activeAyahKey: string | null = null;
  @Input() lemmaBare = '';
  @Output() select = new EventEmitter<string>();
}
