import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

import { json } from '../../_utils/sprint';
import { loadDistillBatchSnapshot, mapDecisionRow, mapSuggestionRow } from '../_distill';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    const url = new URL(ctx.request.url);
    const batchId = url.searchParams.get('batchId')?.trim() || url.searchParams.get('batch_id')?.trim() || '';
    if (!batchId) {
      return json({ ok: false, error: 'A batch id is required.' }, 400);
    }

    const snapshot = await loadDistillBatchSnapshot(ctx.env.DB, batchId, user.id);
    if (!snapshot) {
      return json({ ok: false, error: 'Worldview distill batch not found.' }, 404);
    }

    return json({
      ok: true,
      batch: snapshot.batch,
      items: snapshot.items,
      suggestions: snapshot.suggestions.map(mapSuggestionRow),
      decisions: snapshot.decisions.map(mapDecisionRow),
      draft_output: snapshot.draft_output,
      prompt_version: snapshot.prompt_version,
      model: snapshot.model,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load worldview distill batch.';
    return json({ ok: false, error: message }, 500);
  }
};
