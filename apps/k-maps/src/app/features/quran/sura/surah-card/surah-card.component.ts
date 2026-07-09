import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { SurahActionsComponent } from '../surah-actions/surah-actions.component';
import { QuranSurahListItemDto } from '../../../../shared/models/quran/quran.models';

/**
 * One surah card in the Surahs grid — number ring, Makki/Madani badge, Arabic
 * name, transliteration, ayah/juz meta, and the km-surah-actions pill row.
 * Pure renderer: emits `open` with the surah number when the card is tapped.
 */
@Component({
  selector: 'km-surah-card',
  standalone: true,
  imports: [TitleCasePipe, SurahActionsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './surah-card.component.html',
  styleUrl: './surah-card.component.scss',
})
export class SurahCardComponent {
  @Input({ required: true }) surah!: QuranSurahListItemDto;
  @Output() open = new EventEmitter<number>();
}
