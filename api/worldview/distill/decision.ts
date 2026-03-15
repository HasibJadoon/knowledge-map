import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

import { requireAuth } from '../../_utils/auth';
import { asRecord, json, parseBody, readOptionalString, readTrimmed } from '../../_utils/sprint';
import { hasTable, mapDecisionRow, mapSuggestionRow } from '../_distill';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

type DecisionInput = {
  suggestionId: string;
  decision: 'approve' | 'edit_and_save' | 'reject';
  title: string | null;
  summary: string | null;
  nodeType: string | null;
  relationType: string | null;
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    const db = ctx.env.DB;
    if (!(await hasTable(db, 'wv_insight_suggestions')) || !(await hasTable(db, 'wv_insight_decisions'))) {
      return json({ ok: false, error: 'Worldview insight tables are not available.' }, 500);
    }

    const body = await parseBody(ctx.request);
    if (!body) {
      return json({ ok: false, error: 'Invalid JSON payload.' }, 400);
    }

    const input = normalizeInput(body);
    if (!input) {
      return json({ ok: false, error: 'A suggestion id and decision are required.' }, 400);
    }

    const suggestion = await db
      .prepare(
        `
        SELECT
          s.id,
          s.workspace_id,
          s.group_id,
          s.batch_id,
          s.suggestion_type,
          s.payload_json,
          s.meta_json,
          s.created_at,
          s.updated_at
        FROM wv_insight_suggestions s
        INNER JOIN wv_distill_batches b ON b.id = s.batch_id
        WHERE s.id = ?1
          AND b.user_id = ?2
        LIMIT 1
        `
      )
      .bind(input.suggestionId, user.id)
      .first<Record<string, unknown>>();

    if (!suggestion) {
      return json({ ok: false, error: 'Worldview insight suggestion not found.' }, 404);
    }

    const suggestionStatus =
      input.decision === 'reject' ? 'rejected' : input.decision === 'edit_and_save' ? 'edited' : 'approved';
    const payloadJson = parseJson(suggestion['payload_json']) ?? {};
    const editedPayload =
      input.decision === 'edit_and_save'
        ? {
            ...payloadJson,
            title: input.title ?? readOptionalString(payloadJson['title']),
            summary: input.summary ?? readOptionalString(payloadJson['summary']),
            node_type: input.nodeType ?? readOptionalString(payloadJson['node_type']),
            relation_type: input.relationType ?? readOptionalString(payloadJson['relation_type']),
          }
        : null;

    await db
      .prepare(
        `
        DELETE FROM wv_insight_decisions
        WHERE suggestion_id = ?1
          AND user_id = ?2
        `
      )
      .bind(input.suggestionId, user.id)
      .run();

    await db
      .prepare(
        `
        INSERT INTO wv_insight_decisions (
          workspace_id,
          group_id,
          suggestion_id,
          user_id,
          decision,
          target_type,
          target_id,
          edited_payload_json,
          note,
          created_at,
          updated_at
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, NULL, datetime('now'), datetime('now'))
        `
      )
      .bind(
        readTrimmed(suggestion['workspace_id']),
        readOptionalString(suggestion['group_id']),
        input.suggestionId,
        user.id,
        input.decision,
        readTrimmed(suggestion['suggestion_type']),
        readOptionalString(payloadJson['node_id'])
          || readOptionalString(payloadJson['edge_id'])
          || readOptionalString(payloadJson['document_id']),
        editedPayload ? JSON.stringify(editedPayload) : null,
      )
      .run();

    await db
      .prepare(
        `
        UPDATE wv_insight_suggestions
        SET status = ?2,
            updated_at = datetime('now')
        WHERE id = ?1
        `
      )
      .bind(input.suggestionId, suggestionStatus)
      .run();

    const [updatedSuggestion, updatedDecision] = await Promise.all([
      db
        .prepare(
          `
          SELECT id, batch_id, suggestion_type, payload_json, confidence, rationale, status, meta_json, created_at, updated_at
          FROM wv_insight_suggestions
          WHERE id = ?1
          LIMIT 1
          `
        )
        .bind(input.suggestionId)
        .first<Record<string, unknown>>(),
      db
        .prepare(
          `
          SELECT id, suggestion_id, decision, target_type, target_id, edited_payload_json, note, created_at, updated_at
          FROM wv_insight_decisions
          WHERE suggestion_id = ?1
            AND user_id = ?2
          ORDER BY created_at DESC, id DESC
          LIMIT 1
          `
        )
        .bind(input.suggestionId, user.id)
        .first<Record<string, unknown>>(),
    ]);

    return json({
      ok: true,
      suggestion: updatedSuggestion ? mapSuggestionRow(updatedSuggestion) : null,
      decision: updatedDecision ? mapDecisionRow(updatedDecision) : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save worldview insight decision.';
    return json({ ok: false, error: message }, 500);
  }
};

function normalizeInput(body: Record<string, unknown>): DecisionInput | null {
  const suggestionId = readTrimmed(body['suggestionId'] ?? body['suggestion_id']);
  const rawDecision = readTrimmed(body['decision'])?.toLowerCase();
  const decision =
    rawDecision === 'approved' || rawDecision === 'approve'
      ? 'approve'
      : rawDecision === 'edited' || rawDecision === 'edit_and_save'
        ? 'edit_and_save'
        : rawDecision === 'rejected' || rawDecision === 'reject'
          ? 'reject'
          : null;

  if (!suggestionId || !decision) {
    return null;
  }

  return {
    suggestionId,
    decision,
    title: readOptionalString(body['title']),
    summary: readOptionalString(body['summary']),
    nodeType: readOptionalString(body['nodeType'] ?? body['node_type']),
    relationType: readOptionalString(body['relationType'] ?? body['relation_type']),
  };
}

function parseJson(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
