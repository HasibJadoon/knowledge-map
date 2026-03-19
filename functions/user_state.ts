import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { requireAuth } from './_utils/auth';
import { insertActivityLog, json, parseBody, readString, readTrimmed } from './_utils/sprint';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

type FocusMode = 'planning' | 'studying' | 'producing' | 'reviewing';

function parseFocusMode(value: unknown): FocusMode | null {
  const normalized = readTrimmed(value);
  if (
    normalized === 'planning' ||
    normalized === 'studying' ||
    normalized === 'producing' ||
    normalized === 'reviewing'
  ) {
    return normalized;
  }
  return null;
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    const row = await ctx.env.DB
      .prepare(
        `
        SELECT user_id, current_type, current_id, current_unit_id, focus_mode, state_json, updated_at
        FROM user_state
        WHERE user_id = ?1
        LIMIT 1
        `
      )
      .bind(user.id)
      .first<Record<string, unknown>>();

    if (!row) {
      return json({
        ok: true,
        state: {
          user_id: user.id,
          current_type: null,
          current_id: null,
          current_unit_id: null,
          focus_mode: null,
          state_json: null,
          updated_at: null,
        },
      });
    }

    return json({ ok: true, state: row });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load user state.';
    return json({ ok: false, error: message }, 500);
  }
};

export const onRequestPut: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    const body = await parseBody(ctx.request);
    if (!body) {
      return json({ ok: false, error: 'Invalid JSON payload.' }, 400);
    }

    const focusMode = Object.prototype.hasOwnProperty.call(body, 'focus_mode')
      ? parseFocusMode(body['focus_mode'])
      : null;

    if (Object.prototype.hasOwnProperty.call(body, 'focus_mode') && !focusMode) {
      return json(
        { ok: false, error: 'focus_mode must be one of planning|studying|producing|reviewing.' },
        400
      );
    }

    const currentType = readTrimmed(body['current_type']);
    const currentId = readTrimmed(body['current_id']);
    const currentUnitId = readTrimmed(body['current_unit_id']);
    const stateObject =
      typeof body['state_json'] === 'object' && body['state_json'] !== null && !Array.isArray(body['state_json'])
        ? (body['state_json'] as Record<string, unknown>)
        : null;

    await ctx.env.DB
      .prepare(
        `
        INSERT INTO user_state
          (user_id, current_type, current_id, current_unit_id, focus_mode, state_json, updated_at)
        VALUES
          (?1, ?2, ?3, ?4, ?5, ?6, datetime('now'))
        ON CONFLICT(user_id) DO UPDATE SET
          current_type = excluded.current_type,
          current_id = excluded.current_id,
          current_unit_id = excluded.current_unit_id,
          focus_mode = excluded.focus_mode,
          state_json = excluded.state_json,
          updated_at = datetime('now')
        `
      )
      .bind(
        user.id,
        currentType ?? null,
        currentId ?? null,
        currentUnitId ?? null,
        focusMode ?? null,
        stateObject ? JSON.stringify(stateObject) : null
      )
      .run();

    await insertActivityLog({
      db: ctx.env.DB,
      userId: user.id,
      eventType: 'user_state_update',
      targetType: 'user_state',
      targetId: String(user.id),
      eventJson: {
        current_type: currentType ?? null,
        current_id: currentId ?? null,
        current_unit_id: currentUnitId ?? null,
        focus_mode: focusMode ?? null,
      },
    });

    const row = await ctx.env.DB
      .prepare(
        `
        SELECT user_id, current_type, current_id, current_unit_id, focus_mode, state_json, updated_at
        FROM user_state
        WHERE user_id = ?1
        LIMIT 1
        `
      )
      .bind(user.id)
      .first<Record<string, unknown>>();

    return json({ ok: true, state: row ?? null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update user state.';
    return json({ ok: false, error: message }, 500);
  }
};
