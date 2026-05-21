import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BackendApiService } from '../backend-api.service';
import {
  SrsCard,
  SrsCardCreatePayload,
  SrsCardPatchPayload,
  SrsDeck,
  SrsDeckCreatePayload,
  SrsDeckPatchPayload,
  SrsDeckSummary,
  SrsRating,
  SrsReviewCard,
  SrsStats,
} from '../../models/srs/srs.models';

/** HTTP client for the SRS engine (gateway path /api/ar/srs). */
@Injectable({ providedIn: 'root' })
export class SrsService {
  private readonly api = inject(BackendApiService);
  private readonly http = inject(HttpClient);

  // ── Decks ──────────────────────────────────────────────────────────────────

  listDecks(): Observable<SrsDeckSummary[]> {
    return this.api.getData<SrsDeckSummary[]>('ar', ['srs', 'decks']);
  }

  getDeck(id: string): Observable<SrsDeck> {
    return this.api.getData<SrsDeck>('ar', ['srs', 'decks', id]);
  }

  createDeck(payload: SrsDeckCreatePayload): Observable<SrsDeck> {
    return this.api.postData<SrsDeck>('ar', ['srs', 'decks'], payload);
  }

  patchDeck(id: string, patch: SrsDeckPatchPayload): Observable<SrsDeck> {
    return this.api.patchData<SrsDeck>('ar', ['srs', 'decks', id], patch);
  }

  deleteDeck(id: string): Observable<{ deleted: string }> {
    return this.api.deleteRaw<{ deleted: string }>(['ar', 'srs', 'decks', id]);
  }

  // ── Cards ──────────────────────────────────────────────────────────────────

  listCards(deckId: string): Observable<SrsCard[]> {
    return this.api.getData<SrsCard[]>('ar', ['srs', 'decks', deckId, 'cards']);
  }

  getCard(id: string): Observable<SrsCard> {
    return this.api.getData<SrsCard>('ar', ['srs', 'cards', id]);
  }

  deckDue(deckId: string): Observable<SrsCard[]> {
    return this.api.getData<SrsCard[]>('ar', ['srs', 'decks', deckId, 'due']);
  }

  createCard(payload: SrsCardCreatePayload): Observable<SrsCard> {
    return this.api.postData<SrsCard>('ar', ['srs', 'cards'], payload);
  }

  patchCard(id: string, patch: SrsCardPatchPayload): Observable<SrsCard> {
    return this.api.patchData<SrsCard>('ar', ['srs', 'cards', id], patch);
  }

  deleteCard(id: string): Observable<{ deleted: string }> {
    return this.api.deleteRaw<{ deleted: string }>(['ar', 'srs', 'cards', id]);
  }

  /** Grade a card (1 Again · 2 Hard · 3 Good · 4 Easy) — reschedules via SM-2. */
  gradeCard(id: string, rating: SrsRating, durationSecs?: number): Observable<SrsCard> {
    return this.api.postData<SrsCard>('ar', ['srs', 'cards', id, 'grade'], {
      rating,
      ...(durationSecs != null ? { duration_secs: durationSecs } : {}),
    });
  }

  // ── Review queue & stats ───────────────────────────────────────────────────

  reviewQueue(): Observable<SrsReviewCard[]> {
    return this.api.getData<SrsReviewCard[]>('ar', ['srs', 'review']);
  }

  stats(): Observable<SrsStats> {
    return this.api.getData<SrsStats>('ar', ['srs', 'stats']);
  }

  /** Raw Anki-importable TSV text for a deck. */
  exportDeckTsv(deckId: string): Observable<string> {
    return this.http.get(this.api.url('ar', 'srs', 'decks', deckId, 'export'), {
      responseType: 'text',
    });
  }
}
