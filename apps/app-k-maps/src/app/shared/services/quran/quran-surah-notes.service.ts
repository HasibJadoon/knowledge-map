import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  QuranSurahNotesMode,
  QuranSurahNotesResponse,
  QuranSurahNotesSurah,
  QuranSurahNotesVerse,
  QuranSurahTargetNote,
} from '../../models/quran/quran-surah-notes.model';

@Injectable({ providedIn: 'root' })
export class QuranSurahNotesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBase}/arabic/quran/surahs`;

  getSurahNotes(surah: number, mode: QuranSurahNotesMode): Observable<QuranSurahNotesResponse> {
    const params = new HttpParams().set('mode', mode);

    return this.http.get<unknown>(`${this.baseUrl}/${surah}/notes`, { params }).pipe(
      map((response) => this.normalizeResponse(response, surah, mode)),
      catchError((error: unknown) => {
        return throwError(() => new Error(this.toErrorMessage(error, 'Unable to load surah notes.')));
      })
    );
  }

  private normalizeResponse(response: unknown, surahNumber: number, mode: QuranSurahNotesMode): QuranSurahNotesResponse {
    const root = asRecord(response);
    const surahRecord = asRecord(root?.['surah']);
    const surah = this.normalizeSurah(surahRecord, surahNumber);
    const rawVerses = root?.['verses'];
    const verses = Array.isArray(rawVerses)
      ? rawVerses
        .map((item) => this.normalizeVerse(item, surah.surah))
        .filter((item): item is QuranSurahNotesVerse => item !== null)
      : [];

    return {
      ok: Boolean(root?.['ok'] ?? true),
      mode,
      surah,
      verses,
    };
  }

  private normalizeSurah(record: Record<string, unknown> | null, surahNumber: number): QuranSurahNotesSurah {
    const nameEn = readString(record?.['name_en']) ?? '';
    const nameSimple = readString(record?.['name_simple']) ?? nameEn;

    return {
      surah: readNumber(record?.['surah']) || surahNumber,
      name_ar: readString(record?.['name_ar']) ?? '',
      name_en: nameEn,
      name_simple: nameSimple,
    };
  }

  private normalizeVerse(value: unknown, surahNumber: number): QuranSurahNotesVerse | null {
    const record = asRecord(value);
    const ayah = readNumber(record?.['ayah']);
    if (!ayah) {
      return null;
    }

    const rawNotes = record?.['notes'];
    const notes = Array.isArray(rawNotes)
      ? rawNotes
        .map((item) => this.normalizeNote(item, ayah))
        .filter((item): item is QuranSurahTargetNote => item !== null)
        .sort(compareNotes)
      : [];

    return {
      ayah,
      verseKey: readString(record?.['verse_key']) ?? `${surahNumber}:${ayah}`,
      text: readString(record?.['text']) ?? '',
      notes,
    };
  }

  private normalizeNote(value: unknown, fallbackAyah: number): QuranSurahTargetNote | null {
    const record = asRecord(value);
    const id = readString(record?.['id']);

    if (!id) {
      return null;
    }

    return {
      id,
      user_id: readNumber(record?.['user_id']),
      status: normalizeNoteStatus(readString(record?.['status'])),
      body_md: readString(record?.['body_md']) ?? '',
      title: readString(record?.['title']) ?? null,
      created_at: readString(record?.['created_at']) ?? '',
      updated_at: readString(record?.['updated_at']) ?? '',
      target_type: readString(record?.['target_type']) === 'quran_word' ? 'quran_word' : 'quran_ayah',
      target_id: readString(record?.['target_id']) ?? '',
      ref: readString(record?.['ref']) ?? null,
      ayah: readNumber(record?.['ayah']) || fallbackAyah,
      word_index: readNullableNumber(record?.['word_index']),
    };
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const responseMessage = readString(asRecord(error.error)?.['error']);
      return responseMessage ?? error.message ?? fallback;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return fallback;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
}

function readNullableNumber(value: unknown): number | null {
  const parsed = readNumber(value);
  return parsed > 0 ? parsed : null;
}

function normalizeNoteStatus(value: string | null): QuranSurahTargetNote['status'] {
  const normalized = value?.trim().toLowerCase() ?? '';
  if (normalized === 'flag') {
    return 'flag';
  }

  if (normalized === 'published' || normalized === 'archived') {
    return 'published';
  }

  return 'draft';
}

function compareNotes(left: QuranSurahTargetNote, right: QuranSurahTargetNote): number {
  const leftRank = left.target_type === 'quran_ayah' ? 0 : 1;
  const rightRank = right.target_type === 'quran_ayah' ? 0 : 1;
  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  if (left.word_index != null && right.word_index != null && left.word_index !== right.word_index) {
    return left.word_index - right.word_index;
  }

  return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
}
