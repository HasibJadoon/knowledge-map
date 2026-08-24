// ─── /ar/srs routes — the K-MAPS spaced-repetition engine ────────────────────
// Decks, Anki-style cards, the unified review queue and SM-2 grading.
// Every deck and card is scoped to the authenticated user (X-KM-User-Id).

import type { Router } from '../../../shared/src/router';
import {
  ok, created, notFound, badRequest, unauthorized, forbidden,
} from '../../../shared/src/response';
import type { ArabicEnv } from '../env';
import { SrsRepo, type SrsCard } from '../repositories/srs.repo';
import { schedule, isRating, previewIntervals } from '../srs/scheduler';
import { actorRef } from '../auth';
import { readJsonObject } from '../../../shared/src/validate';

const DECK_TYPES = new Set([
  'vocabulary', 'morphology', 'translation', 'theology', 'topic', 'idiom',
  'poetry', 'literature', 'quote', 'concept', 'hadith', 'fiqh',
  'brainstorm', 'mixed',
]);

const CARD_TEMPLATES = new Set([
  'qr_vocab', 'qr_morph', 'qr_translation', 'qr_theology', 'qr_topic', 'qr_idiom',
  'ar_poetry', 'ar_literature', 'wv_quote', 'wv_concept', 'hd_hadith', 'hd_fiqh',
  'freeform',
]);


function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

/** Card → API shape: extra_json parsed, tags split into an array. */
function cardToApi(c: SrsCard) {
  let extra: unknown = null;
  if (c.extra_json) { try { extra = JSON.parse(c.extra_json); } catch { extra = null; } }
  return {
    id: c.id,
    deck_id: c.deck_id,
    resource_ref: c.resource_ref || null,
    resource_type: c.resource_type,
    card_template: c.card_template,
    front_text: c.front_text,
    back_text: c.back_text,
    extra,
    tags: c.tags ? c.tags.split(/\s+/).filter(Boolean) : [],
    suspended: c.suspended === 1,
    card_state: c.card_state,
    reps: c.reps,
    lapses: c.lapses,
    difficulty: c.difficulty,
    scheduled_days: c.scheduled_days,
    due_at: c.next_review_at,
    last_review_at: c.last_review_at,
    created_at: c.created_at,
    updated_at: c.updated_at,
  };
}

function normalizeTags(v: unknown): string | null {
  if (Array.isArray(v)) {
    const joined = v.filter((t) => typeof t === 'string').join(' ').trim();
    return joined || null;
  }
  if (typeof v === 'string') return v.trim() || null;
  return null;
}

export function srsRoutes(router: Router<ArabicEnv>) {

  // ── Decks ──────────────────────────────────────────────────────────────────

  // GET /ar/srs/decks — the user's decks with live due / new counts
  router.get('/ar/srs/decks', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    return ok(await new SrsRepo(env.DB_AR).decksWithCounts(user));
  });

  // POST /ar/srs/decks — create a deck
  router.post('/ar/srs/decks', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const b = await readJsonObject(req);
    if (!b) return badRequest('Request body must be a JSON object');
    const title = str(b['title'])?.trim();
    if (!title) return badRequest('title is required');
    const deckType = str(b['deck_type']) ?? 'mixed';
    if (!DECK_TYPES.has(deckType)) return badRequest(`deck_type must be one of: ${[...DECK_TYPES].join(', ')}`);
    const deck = await new SrsRepo(env.DB_AR).createDeck({
      core_user_ref: user,
      title,
      deck_type: deckType,
      description: str(b['description']) ?? null,
    });
    return created(deck);
  });

  // GET /ar/srs/decks/:id — deck detail
  router.get('/ar/srs/decks/:id', async (req, env, { id }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const deck = await new SrsRepo(env.DB_AR).findDeckById(id);
    if (!deck) return notFound(`deck ${id}`);
    if (deck.core_user_ref !== user) return forbidden('Not your deck');
    return ok(deck);
  });

  // PATCH /ar/srs/decks/:id — rename / retype a deck
  router.patch('/ar/srs/decks/:id', async (req, env, { id }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const repo = new SrsRepo(env.DB_AR);
    const deck = await repo.findDeckById(id);
    if (!deck) return notFound(`deck ${id}`);
    if (deck.core_user_ref !== user) return forbidden('Not your deck');
    const b = await readJsonObject(req);
    if (!b) return badRequest('Request body must be a JSON object');
    if (b['deck_type'] !== undefined && !DECK_TYPES.has(String(b['deck_type'])))
      return badRequest(`deck_type must be one of: ${[...DECK_TYPES].join(', ')}`);
    const updated = await repo.patchDeck(id, {
      title:       str(b['title'])?.trim() || undefined,
      deck_type:   str(b['deck_type']),
      description: b['description'] !== undefined ? (str(b['description']) ?? null) : undefined,
    });
    return ok(updated);
  });

  // DELETE /ar/srs/decks/:id — delete a deck and all its cards
  router.delete('/ar/srs/decks/:id', async (req, env, { id }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const repo = new SrsRepo(env.DB_AR);
    const deck = await repo.findDeckById(id);
    if (!deck) return notFound(`deck ${id}`);
    if (deck.core_user_ref !== user) return forbidden('Not your deck');
    await repo.deleteDeck(id);
    return ok({ deleted: id });
  });

  // GET /ar/srs/decks/:id/cards — every card in a deck
  router.get('/ar/srs/decks/:id/cards', async (req, env, { id }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const repo = new SrsRepo(env.DB_AR);
    const deck = await repo.findDeckById(id);
    if (!deck) return notFound(`deck ${id}`);
    if (deck.core_user_ref !== user) return forbidden('Not your deck');
    const cards = await repo.cardsInDeck(id);
    return ok(cards.map(cardToApi));
  });

  // GET /ar/srs/decks/:id/due — the deck's due review queue
  router.get('/ar/srs/decks/:id/due', async (req, env, { id }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const repo = new SrsRepo(env.DB_AR);
    const deck = await repo.findDeckById(id);
    if (!deck) return notFound(`deck ${id}`);
    if (deck.core_user_ref !== user) return forbidden('Not your deck');
    const limit = Math.min(200, Math.max(1, parseInt(new URL(req.url).searchParams.get('limit') ?? '60', 10) || 60));
    const cards = await repo.dueCards(id, user, limit);
    return ok(cards.map(cardToApi));
  });

  // ── Cards ──────────────────────────────────────────────────────────────────

  // GET /ar/srs/cards/:id — a single card
  router.get('/ar/srs/cards/:id', async (req, env, { id }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const card = await new SrsRepo(env.DB_AR).findCardById(id);
    if (!card) return notFound(`card ${id}`);
    if (card.core_user_ref !== user) return forbidden('Not your card');
    return ok(cardToApi(card));
  });

  // POST /ar/srs/cards — create a card in a deck
  router.post('/ar/srs/cards', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const b = await readJsonObject(req);
    if (!b) return badRequest('Request body must be a JSON object');
    const deckId = str(b['deck_id']);
    if (!deckId) return badRequest('deck_id is required');
    const front = str(b['front_text'])?.trim();
    const back  = str(b['back_text'])?.trim();
    if (!front || !back) return badRequest('front_text and back_text are required');
    const template = str(b['card_template']) ?? 'freeform';
    if (!CARD_TEMPLATES.has(template))
      return badRequest(`card_template must be one of: ${[...CARD_TEMPLATES].join(', ')}`);

    const repo = new SrsRepo(env.DB_AR);
    const deck = await repo.findDeckById(deckId);
    if (!deck) return notFound(`deck ${deckId}`);
    if (deck.core_user_ref !== user) return forbidden('Not your deck');

    const extra = b['extra'];
    const card = await repo.createCard({
      deck_id: deckId,
      core_user_ref: user,
      resource_ref: str(b['resource_ref']) ?? '',
      resource_type: str(b['resource_type']) ?? 'other',
      card_template: template,
      front_text: front,
      back_text: back,
      extra_json: extra != null ? JSON.stringify(extra) : null,
      tags: normalizeTags(b['tags']),
    });
    return created(cardToApi(card));
  });

  // PATCH /ar/srs/cards/:id — edit content, retag, suspend / unsuspend
  router.patch('/ar/srs/cards/:id', async (req, env, { id }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const repo = new SrsRepo(env.DB_AR);
    const card = await repo.findCardById(id);
    if (!card) return notFound(`card ${id}`);
    if (card.core_user_ref !== user) return forbidden('Not your card');
    const b = await readJsonObject(req);
    if (!b) return badRequest('Request body must be a JSON object');

    const updated = await repo.updateCard(id, {
      front_text: b['front_text'] !== undefined ? (str(b['front_text']) ?? '') : undefined,
      back_text:  b['back_text']  !== undefined ? (str(b['back_text'])  ?? '') : undefined,
      extra_json: b['extra'] !== undefined ? (b['extra'] != null ? JSON.stringify(b['extra']) : null) : undefined,
      tags:       b['tags'] !== undefined ? normalizeTags(b['tags']) : undefined,
      suspended:  b['suspended'] !== undefined ? (b['suspended'] ? 1 : 0) : undefined,
    });
    return ok(cardToApi(updated!));
  });

  // DELETE /ar/srs/cards/:id
  router.delete('/ar/srs/cards/:id', async (req, env, { id }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const repo = new SrsRepo(env.DB_AR);
    const card = await repo.findCardById(id);
    if (!card) return notFound(`card ${id}`);
    if (card.core_user_ref !== user) return forbidden('Not your card');
    await repo.deleteCard(card);
    return ok({ deleted: id });
  });

  // POST /ar/srs/cards/:id/grade — record a review; SM-2 reschedules the card
  router.post('/ar/srs/cards/:id/grade', async (req, env, { id }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const repo = new SrsRepo(env.DB_AR);
    const card = await repo.findCardById(id);
    if (!card) return notFound(`card ${id}`);
    if (card.core_user_ref !== user) return forbidden('Not your card');

    const b = await readJsonObject(req);
    const rating = b?.['rating'];
    if (!isRating(rating)) return badRequest('rating must be 1 (Again), 2 (Hard), 3 (Good) or 4 (Easy)');
    const durationSecs = typeof b?.['duration_secs'] === 'number' ? Math.round(b['duration_secs'] as number) : null;

    const now = new Date();
    const next = schedule(
      {
        card_state: card.card_state,
        difficulty: card.difficulty,
        scheduled_days: card.scheduled_days,
        reps: card.reps,
        lapses: card.lapses,
        last_review_at: card.last_review_at,
      },
      rating,
      now,
    );

    const updated = await repo.updateCard(id, {
      card_state: next.card_state,
      difficulty: next.difficulty,
      stability: next.stability,
      elapsed_days: next.elapsed_days,
      scheduled_days: next.scheduled_days,
      reps: next.reps,
      lapses: next.lapses,
      last_review_at: now.toISOString(),
      next_review_at: next.next_review_at,
    });
    await repo.logReview({
      card_id: id,
      core_user_ref: user,
      rating,
      stability_after: next.stability,
      difficulty_after: next.difficulty,
      scheduled_days_after: next.scheduled_days,
      state_after: next.card_state,
      review_duration_secs: durationSecs,
    });
    return ok(cardToApi(updated!));
  });

  // ── Review queue & stats ───────────────────────────────────────────────────

  // GET /ar/srs/review — the unified due queue across every deck
  router.get('/ar/srs/review', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const limit = Math.min(300, Math.max(1, parseInt(new URL(req.url).searchParams.get('limit') ?? '120', 10) || 120));
    const cards = await new SrsRepo(env.DB_AR).dueAcrossDecks(user, limit);
    const now = new Date();
    return ok(cards.map((c) => ({
      ...cardToApi(c),
      preview: previewIntervals({
        card_state: c.card_state,
        difficulty: c.difficulty,
        scheduled_days: c.scheduled_days,
        reps: c.reps,
        lapses: c.lapses,
        last_review_at: c.last_review_at,
      }, now),
    })));
  });

  // GET /ar/srs/stats — dashboard counters
  router.get('/ar/srs/stats', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    return ok(await new SrsRepo(env.DB_AR).stats(user));
  });

  // GET /ar/srs/decks/:id/export — Anki-importable TSV for one deck
  router.get('/ar/srs/decks/:id/export', async (req, env, { id }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const repo = new SrsRepo(env.DB_AR);
    const deck = await repo.findDeckById(id);
    if (!deck) return notFound(`deck ${id}`);
    if (deck.core_user_ref !== user) return forbidden('Not your deck');

    const cards = await repo.cardsInDeck(id);
    // Anki's text importer: tab-separated, HTML allowed, third column = tags.
    const header = ['#separator:tab', '#html:true', '#tags column:3', ''].join('\n');
    const body = cards
      .map((c) => [ankiField(c.front_text), ankiField(c.back_text), (c.tags ?? '').trim()].join('\t'))
      .join('\n');
    const tsv = header + body + '\n';

    const safeName = (deck.title || 'deck').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    return new Response(tsv, {
      headers: {
        'Content-Type': 'text/tab-separated-values; charset=utf-8',
        'Content-Disposition': `attachment; filename="km-srs-${safeName}.txt"`,
      },
    });
  });
}

/** Make a card face safe for one TSV cell: tabs → spaces, newlines → <br>. */
function ankiField(text: string): string {
  return (text ?? '')
    .replace(/\t/g, '    ')
    .replace(/\r?\n/g, '<br>');
}
