import { Injectable, signal } from '@angular/core';
import { QuranBrowseSurah } from '../../../../shared/models/quran/quran-reader.model';

interface QuranReaderHeaderHandlers {
  goToSurah: (value: string) => void;
  goToVerse: (value: string) => void;
  goToPage: (value: string) => void;
}

@Injectable()
export class QuranReaderHeaderService {
  private handlers: QuranReaderHeaderHandlers | null = null;

  readonly visible = signal(false);
  readonly disabled = signal(true);
  readonly surahs = signal<QuranBrowseSurah[]>([]);
  readonly activeSurah = signal(1);
  readonly activeVerse = signal(1);
  readonly activePage = signal(1);

  registerHandlers(handlers: QuranReaderHeaderHandlers): void {
    this.handlers = handlers;
    this.visible.set(true);
  }

  clearHandlers(): void {
    this.handlers = null;
    this.visible.set(false);
    this.disabled.set(true);
  }

  updateState(state: {
    surahs: QuranBrowseSurah[];
    activeSurah: number;
    activeVerse: number;
    activePage: number;
    disabled: boolean;
  }): void {
    this.surahs.set(state.surahs);
    this.activeSurah.set(state.activeSurah);
    this.activeVerse.set(state.activeVerse);
    this.activePage.set(state.activePage);
    this.disabled.set(state.disabled);
  }

  goToSurah(value: string): void {
    this.handlers?.goToSurah(value);
  }

  goToVerse(value: string): void {
    this.handlers?.goToVerse(value);
  }

  goToPage(value: string): void {
    this.handlers?.goToPage(value);
  }
}
