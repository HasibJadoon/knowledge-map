import {
  ChangeDetectionStrategy, Component, EventEmitter,
  Output, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { debounceTime, distinctUntilChanged, Subject, switchMap, of, catchError } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AlDictionaryApiService } from '../../../../../../shared/services/al-dictionary-api.service';
import { mapLaneGroupedRow, WARNING_LABELS } from '../lane-display.utils';
import type { LaneDisplayEntry } from '../lane-display.types';

@Component({
  selector: 'km-lane-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lane-table.component.html',
  styleUrl: './lane-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LaneTableComponent {
  @Output() closed = new EventEmitter<void>();

  private readonly api = inject(AlDictionaryApiService);

  readonly searchTerm    = signal('');
  readonly loading       = signal(false);
  readonly entries       = signal<LaneDisplayEntry[]>([]);
  readonly totalCount    = signal(0);
  readonly error         = signal<string | null>(null);
  readonly selectedEntry = signal<LaneDisplayEntry | null>(null);
  readonly rawOpen       = signal(false);
  readonly copiedId      = signal<string | null>(null);

  readonly warningLabels = WARNING_LABELS;

  readonly quickRoots = ['علم', 'كتب', 'قرأ', 'رحم', 'حمد', 'أمن', 'نزل', 'خلق'];

  private readonly search$ = new Subject<string>();

  constructor() {
    this.search$.pipe(
      debounceTime(380),
      distinctUntilChanged(),
      switchMap(q => {
        const t = q.trim();
        if (!t) {
          this.entries.set([]);
          this.totalCount.set(0);
          this.error.set(null);
          this.loading.set(false);
          return of(null);
        }
        this.loading.set(true);
        this.error.set(null);
        return this.api.getLaneTableEntries(t).pipe(
          catchError(() => {
            this.error.set('تعذّر تحميل البيانات. تأكد من الاتصال.');
            return of(null);
          }),
        );
      }),
      takeUntilDestroyed(),
    ).subscribe(res => {
      this.loading.set(false);
      if (!res) return;
      this.entries.set(res.entries.map(mapLaneGroupedRow));
      this.totalCount.set(res.total);
    });
  }

  setSearch(value: string): void {
    this.searchTerm.set(value);
    this.search$.next(value);
  }

  tryRoot(root: string): void { this.setSearch(root); }

  openEntry(entry: LaneDisplayEntry): void {
    this.selectedEntry.set(entry);
    this.rawOpen.set(false);
  }

  closeEntry(): void {
    this.selectedEntry.set(null);
    this.rawOpen.set(false);
  }

  toggleRaw(): void { this.rawOpen.update(v => !v); }

  copyDef(entry: LaneDisplayEntry): void {
    navigator.clipboard.writeText(entry.definitionDisplay).then(() => {
      this.copiedId.set(entry.id);
      setTimeout(() => this.copiedId.set(null), 1600);
    });
  }

  hasWarnings(entry: LaneDisplayEntry): boolean { return entry.warnings.length > 0; }

  statusClass(status: string): string {
    return `lt-status lt-status--${status}`;
  }

  warningLabel(w: string): string {
    return this.warningLabels[w] ?? w;
  }

  prettifyJson(s: string | null): string {
    if (!s) return '';
    try { return JSON.stringify(JSON.parse(s), null, 2); } catch { return s; }
  }
}
