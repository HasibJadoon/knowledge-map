import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { BackendApiService } from '../core/backend-api.service';

// ---- models ----------------------------------------------------------------

/** Raw word occurrence row from km-quran-worker (qr_word_occurrences). */
interface QrWordRow {
  surah: number;
  ayah: number;
  word_index: number;
  word_text: string;
  root: string | null;
  lemma: string | null;
  pos: string | null;
  morphology_tag: string | null;
  morphology_tag_json: string | null;
}

/** One Qur'anic occurrence of a root, with its morphology decoded to a
 *  human-readable grammar line. */
export interface QrMorphOccurrence {
  surah: number;
  ayah: number;
  ref: string; // "39:3"
  wordAr: string; // vocalized stem form (or the surface word)
  lemmaAr: string | null;
  readable: string; // "verb · Form IV · perfect · passive · 3rd fem. sing."
}

// ---- flag decoding (QAC-0.4 feature flags) ---------------------------------

const POS_LABEL: Record<string, string> = {
  V: 'verb',
  N: 'noun',
  ADJ: 'adjective',
  PN: 'proper noun',
  PRON: 'pronoun',
};

/** Decode a person/gender/number code such as "3FS", "1P", "MP", "MS". */
function decodePgn(code: string): string {
  const out: string[] = [];
  let rest = code;
  const person: Record<string, string> = { '1': '1st', '2': '2nd', '3': '3rd' };
  if (person[rest[0]]) {
    out.push(`${person[rest[0]]}`);
    rest = rest.slice(1);
  }
  for (const ch of rest) {
    if (ch === 'M') out.push('masc.');
    else if (ch === 'F') out.push('fem.');
    else if (ch === 'S') out.push('sing.');
    else if (ch === 'D') out.push('dual');
    else if (ch === 'P') out.push('pl.');
  }
  return out.join(' ');
}

/** Turn the QAC stem POS + flags into a readable grammar line. */
function decodeGrammar(pos: string, flags: string[]): string {
  const parts: string[] = [POS_LABEL[pos] ?? pos.toLowerCase()];

  const form = flags.find((f) => /^\((?:I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)\)$/.test(f));
  if (form) parts.push(`Form ${form.replace(/[()]/g, '')}`);

  if (flags.includes('PERF')) parts.push('perfect');
  else if (flags.includes('IMPF')) parts.push('imperfect');
  else if (flags.includes('IMPV')) parts.push('imperative');

  if (flags.includes('PASS')) parts.push('passive');

  const pgn = flags.find((f) => /^[123]?[MF]?[MF]?[SDP]$/.test(f));
  if (pgn) parts.push(decodePgn(pgn));
  else if (flags.includes('F')) parts.push('fem.');
  else if (flags.includes('M')) parts.push('masc.');

  if (flags.includes('NOM')) parts.push('nominative');
  else if (flags.includes('ACC')) parts.push('accusative');
  else if (flags.includes('GEN')) parts.push('genitive');

  if (flags.includes('INDEF')) parts.push('indefinite');

  return parts.join(' · ');
}

interface QacStem {
  form_ar?: string;
  pos?: string;
  lemma_ar?: string;
  flags?: string[];
}

// ---- service ---------------------------------------------------------------

/**
 * Read-only companion to the Five-Lens modal: pulls every Qur'anic occurrence
 * of a root from km-quran-worker (qr_word_occurrences) via the backend gateway
 * at /api/qr/words/by-root, and decodes each token's QAC morphology into a
 * readable grammar line. Never writes.
 */
@Injectable({ providedIn: 'root' })
export class QrWordStudyService {
  private readonly api = inject(BackendApiService);
  private readonly cache = new Map<string, QrMorphOccurrence[]>();

  /** Decoded morphology for every occurrence of `root` across the Qur'an. */
  getMorphologyByRoot(root: string): Observable<QrMorphOccurrence[]> {
    const cached = this.cache.get(root);
    if (cached) return of(cached);

    return this.api
      .getData<QrWordRow[]>('qr', ['words', 'by-root'], { params: { root, per_page: 100 } })
      .pipe(
        map((rows) => (rows ?? []).map((r) => this.toOccurrence(r))),
        tap((list) => this.cache.set(root, list)),
        catchError(() => of([] as QrMorphOccurrence[])),
      );
  }

  private toOccurrence(r: QrWordRow): QrMorphOccurrence {
    let stem: QacStem = {};
    try {
      const parsed = r.morphology_tag_json ? (JSON.parse(r.morphology_tag_json) as { stem?: QacStem }) : null;
      stem = parsed?.stem ?? {};
    } catch {
      stem = {};
    }
    const pos = stem.pos ?? r.pos ?? '';
    const flags = stem.flags ?? [];
    return {
      surah: r.surah,
      ayah: r.ayah,
      ref: `${r.surah}:${r.ayah}`,
      // word_text is the clean mushaf token; stem.form_ar carries QAC encoding
      // artifacts (e.g. alif-maqṣūra rendered as "Y"), so prefer the surface word.
      wordAr: r.word_text ?? stem.form_ar ?? '',
      lemmaAr: stem.lemma_ar ?? r.lemma,
      readable: pos ? decodeGrammar(pos, flags) : '',
    };
  }
}
