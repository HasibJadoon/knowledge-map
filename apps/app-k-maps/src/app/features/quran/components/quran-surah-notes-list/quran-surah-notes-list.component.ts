import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { computePreview, computeTitleFromMarkdown } from '../../../../shared/models/notes.model';
import { QuranSurahNotesVerse, QuranSurahTargetNote } from '../../models/quran-surah-notes.model';

@Component({
  selector: 'app-quran-surah-notes-list',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterLink],
  templateUrl: './quran-surah-notes-list.component.html',
  styleUrl: './quran-surah-notes-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuranSurahNotesListComponent {
  @Input({ required: true }) verses: QuranSurahNotesVerse[] = [];
  @Input() expandedVerseKey: string | null = null;

  trackByVerse(_: number, verse: QuranSurahNotesVerse): string {
    return verse.verseKey;
  }

  trackByNote(_: number, note: QuranSurahTargetNote): string {
    return `${note.id}:${note.target_id}`;
  }

  titleFor(note: QuranSurahTargetNote): string {
    return note.title?.trim() || computeTitleFromMarkdown(note.body_md) || 'Untitled';
  }

  previewFor(note: QuranSurahTargetNote): string {
    return computePreview(note.body_md, 160) || 'Open note';
  }

  targetLabel(note: QuranSurahTargetNote): string {
    if (note.target_type === 'quran_word' && note.word_index != null) {
      return `Word ${note.word_index}`;
    }

    return 'Verse';
  }

  noteCountLabel(count: number): string {
    return count === 1 ? '1 note' : `${count} notes`;
  }
}
