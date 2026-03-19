import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

import { requireAuth } from '../../_utils/auth';
import { json } from '../../_utils/sprint';
import { loadLatestDistillBatchSnapshotForUnit, mapDecisionRow, mapSuggestionRow } from '../_distill';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    const url = new URL(ctx.request.url);
    const sourceId = url.searchParams.get('sourceId')?.trim() || url.searchParams.get('source_id')?.trim() || '';
    const sourceUnitId = url.searchParams.get('sourceUnitId')?.trim() || url.searchParams.get('source_unit_id')?.trim() || '';

    if (!sourceId || !sourceUnitId) {
      return json({ ok: false, error: 'A source id and source unit id are required.' }, 400);
    }

    const snapshot = await loadLatestDistillBatchSnapshotForUnit(ctx.env.DB, sourceId, sourceUnitId, user.id);
    if (!snapshot) {
      return json({
        ok: true,
        batch: null,
        items: [],
        suggestions: [],
        decisions: [],
        draft_output: null,
        prompt_version: null,
        model: null,
      });
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
    const message = error instanceof Error ? error.message : 'Failed to load worldview distill batch for this passage.';
    return json({ ok: false, error: message }, 500);
  }
};
