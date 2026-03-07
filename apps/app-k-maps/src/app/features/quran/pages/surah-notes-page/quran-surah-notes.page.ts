import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { IonicModule, RefresherCustomEvent } from '@ionic/angular';
import { checkmarkDoneOutline, createOutline, flagOutline } from 'ionicons/icons';
import { BehaviorSubject, combineLatest, of } from 'rxjs';
import { catchError, distinctUntilChanged, map, switchMap, tap } from 'rxjs/operators';
import { AppIconTabsComponent, IconTabItem } from '../../../../shared/components/icon-tabs/icon-tabs.component';
import { QuranSurahNotesListComponent } from '../../components/quran-surah-notes-list/quran-surah-notes-list.component';
import {
  QuranSurahNotesMode,
  QuranSurahNotesResponse,
} from '../../models/quran-surah-notes.model';
import { QuranSurahNotesService } from '../../../../shared/services/quran-surah-notes.service';

type LoadResult =
  | { kind: 'data'; response: QuranSurahNotesResponse }
  | { kind: 'error'; message: string };

@Component({
  selector: 'app-quran-surah-notes-page',
  standalone: true,
  imports: [CommonModule, IonicModule, QuranSurahNotesListComponent, AppIconTabsComponent],
  templateUrl: './quran-surah-notes.page.html',
  styleUrl: './quran-surah-notes.page.scss',
})
export class QuranSurahNotesPage {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly surahNotes = inject(QuranSurahNotesService);
  private readonly modeChanges = new BehaviorSubject<QuranSurahNotesMode>('draft');
  private readonly refreshTick = new BehaviorSubject(0);
  private refreshComplete: (() => void) | null = null;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly response = signal<QuranSurahNotesResponse | null>(null);
  readonly mode = signal<QuranSurahNotesMode>('draft');
  readonly modeTabs: ReadonlyArray<IconTabItem> = [
    { key: 'draft', label: 'Draft', icon: createOutline },
    { key: 'flag', label: 'Flag', icon: flagOutline },
    { key: 'published', label: 'Published', icon: checkmarkDoneOutline },
  ];

  readonly totalNotes = computed(() => {
    const response = this.response();
    if (!response) {
      return 0;
    }

    return response.verses.reduce((sum, verse) => sum + verse.notes.length, 0);
  });

  readonly pageTitle = computed(() => {
    const surah = this.response()?.surah;
    if (!surah) {
      return 'Surah Notes';
    }

    return surah.name_simple || surah.name_en || `Surah ${surah.surah}`;
  });

  readonly summaryLabel = computed(() => {
    const count = this.totalNotes();
    if (count === 0) {
      return 'No targeted notes';
    }

    return count === 1 ? '1 targeted note' : `${count} targeted notes`;
  });

  readonly emptyTitle = computed(() => {
    if (this.mode() === 'published') {
      return 'No published notes';
    }

    if (this.mode() === 'flag') {
      return 'No flagged notes';
    }

    return 'No drafts for this surah';
  });

  readonly emptyMessage = computed(() => {
    if (this.mode() === 'published') {
      return 'Archive a targeted note to collect it here under its verse.';
    }

    if (this.mode() === 'flag') {
      return 'Use #flag or [flag] inside a targeted note to surface it here.';
    }

    return 'Long-press a verse or word in the reader to capture a note for this surah.';
  });

  readonly errorTitle = computed(() => 'Unable to load surah notes');

  constructor() {
    const surah$ = this.route.paramMap.pipe(
      map((params) => parseSurah(params.get('surah'))),
      distinctUntilChanged()
    );

    combineLatest([
      surah$,
      this.modeChanges.pipe(distinctUntilChanged()),
      this.refreshTick,
    ]).pipe(
      tap(([surah, mode]) => {
        this.mode.set(mode);
        this.loading.set(true);
        this.error.set(surah == null ? 'Surah is missing or invalid.' : null);
        if (surah == null) {
          this.response.set(null);
        }
      }),
      switchMap(([surah, mode]) => {
        if (surah == null) {
          return of<LoadResult>({ kind: 'error', message: 'Surah is missing or invalid.' });
        }

        return this.surahNotes.getSurahNotes(surah, mode).pipe(
          map((response) => ({ kind: 'data', response }) as LoadResult),
          catchError((error: unknown) => {
            const message = error instanceof Error ? error.message : 'Could not load surah notes.';
            return of<LoadResult>({ kind: 'error', message });
          })
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((result) => {
      this.loading.set(false);

      if (result.kind === 'error') {
        this.response.set(null);
        this.error.set(result.message);
        this.refreshComplete?.();
        this.refreshComplete = null;
        return;
      }

      this.error.set(null);
      this.response.set(result.response);
      this.refreshComplete?.();
      this.refreshComplete = null;
    });
  }

  onModeTabSelected(tabKey: string): void {
    const nextMode = parseMode(tabKey);
    if (nextMode === this.mode()) {
      return;
    }

    this.modeChanges.next(nextMode);
  }

  onRefresh(event: RefresherCustomEvent): void {
    this.refreshComplete = () => event.target.complete();
    this.refreshTick.next(this.refreshTick.value + 1);
  }
}

function parseSurah(value: string | null): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 114) {
    return null;
  }

  return parsed;
}

function parseMode(value: string | null | undefined): QuranSurahNotesMode {
  if (value === 'flag' || value === 'published') {
    return value;
  }

  return 'draft';
}
