import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { BackendApiService } from '../../../../../shared/services/core/backend-api.service';
import { AntonymRow, IdiomRow, TafsirRow, VgRow } from './fused-word.models';

/**
 * Reads the word-view panels that live outside the Five-Lens service:
 *   verb government   → al/verb-government/:root   (ar_ling_verb_government)
 *   root antonyms     → al/root-antonyms/:root     (ar_ling_root_antonyms)
 *   Mir verbal idioms → al/expressions/:root       (ar_ling_expressions)
 *   tafsīr per work   → qr/tafsir/:surah/:ayah     (qr_tafsir_entries)
 * Each call degrades to [] if the endpoint isn't deployed yet, so the
 * component renders an empty/"pending" panel rather than failing.
 */
@Injectable({ providedIn: 'root' })
export class WordExtrasService {
  private readonly api = inject(BackendApiService);

  verbGovernment(root: string): Observable<VgRow[]> {
    return this.api.getData<VgRow[]>('al', ['verb-government', root]).pipe(
      map((rows) => rows ?? []),
      catchError(() => of([])),
    );
  }

  antonyms(root: string): Observable<AntonymRow[]> {
    return this.api.getData<AntonymRow[]>('al', ['root-antonyms', root]).pipe(
      map((rows) => rows ?? []),
      catchError(() => of([])),
    );
  }

  idioms(root: string): Observable<IdiomRow[]> {
    return this.api.getData<IdiomRow[]>('al', ['expressions', 'by-root', root]).pipe(
      map((rows) => rows ?? []),
      catchError(() => of([])),
    );
  }

  /** tafsīr glosses for an āyah (qr_tafsir_entries: one row per work). */
  tafsir(surah: number, ayah: number): Observable<TafsirRow[]> {
    return this.api.getData<TafsirRow[]>('qr', ['tafsir', surah, ayah]).pipe(
      map((rows) => rows ?? []),
      catchError(() => of([])),
    );
  }
}
