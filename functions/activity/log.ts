import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { requireAuth } from '../_utils/auth';
import { insertActivityLog, json, parseBody, readString, readTrimmed } from '../_utils/sprint';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    const body = await parseBody(ctx.request);
    if (!body) {
      return json({ ok: false, error: 'Invalid JSON payload.' }, 400);
    }

    const eventType = readTrimmed(body['event_type']);
    if (!eventType) {
      return json({ ok: false, error: 'event_type is required.' }, 400);
    }

    await insertActivityLog({
      db: ctx.env.DB,
      userId: user.id,
      eventType,
      targetType: readTrimmed(body['target_type']),
      targetId: readTrimmed(body['target_id']),
      ref: readTrimmed(body['ref']),
      note: readString(body['note']),
      eventJson:
        typeof body['event_json'] === 'object' && body['event_json'] !== null
          ? body['event_json']
          : undefined,
    });

    return json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to write activity log.';
    return json({ ok: false, error: message }, 500);
  }
};
