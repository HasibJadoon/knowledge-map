// ─── /pl/captures routes — quick-capture TipTap notes ────────────────────────

import type { Router } from '../../../shared/src/router';
import { ok, created, notFound, badRequest, unauthorized } from '../../../shared/src/response';
import type { PlannerEnv } from '../env';
import { CaptureNoteRepo, CaptureNoteRow, CaptureNotePatch } from '../repositories/capture.repo';
import { actorRef } from '../auth';

async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}

function safeParse(value: string | null): unknown {
  if (value === null) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/** DB row → API shape: doc_json/meta_json become parsed objects. */
function toApi(row: CaptureNoteRow) {
  return {
    id: row.id,
    core_user_ref: row.core_user_ref,
    core_ws_ref: row.core_ws_ref,
    status: row.status,
    title: row.title,
    text: row.text,
    doc: safeParse(row.doc_json),
    meta: safeParse(row.meta_json),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function isDoc(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function captureRoutes(router: Router<PlannerEnv>) {

  // GET /pl/captures?status=inbox&limit=50 — the authenticated user's captures
  router.get('/pl/captures', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const url = new URL(req.url);
    const status = url.searchParams.get('status') === 'archived' ? 'archived' : 'inbox';
    const limitRaw = Number(url.searchParams.get('limit'));
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 200) : 50;
    const rows = await new CaptureNoteRepo(env.DB_PL).list(user, status, limit);
    return ok(rows.map(toApi));
  });

  // GET /pl/captures/:id
  router.get('/pl/captures/:id', async (_req, env, { id }) => {
    const row = await new CaptureNoteRepo(env.DB_PL).findById(id);
    return row ? ok(toApi(row)) : notFound(`capture ${id}`);
  });

  // POST /pl/captures — create a capture for the authenticated user
  router.post('/pl/captures', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const body = await readJson(req);
    if (!isDoc(body)) return badRequest('Request body must be a JSON object');
    const b = body as Record<string, unknown>;
    if (!isDoc(b['doc'])) return badRequest('doc is required and must be a TipTap document object');
    const text  = typeof b['text'] === 'string' ? b['text'] : '';
    const title = typeof b['title'] === 'string' && b['title'].trim() ? b['title'].trim() : null;
    const status = b['status'] === 'archived' ? 'archived' : 'inbox';
    const row = await new CaptureNoteRepo(env.DB_PL).create({
      core_user_ref: user,
      status,
      title,
      doc_json: JSON.stringify(b['doc']),
      text,
      meta_json: b['meta'] != null ? JSON.stringify(b['meta']) : null,
    });
    return created(toApi(row));
  });

  // PATCH /pl/captures/:id — update document, text, title or status
  router.patch('/pl/captures/:id', async (req, env, { id }) => {
    const body = await readJson(req);
    if (!isDoc(body)) return badRequest('Request body must be a JSON object');
    const b = body as Record<string, unknown>;
    const patch: CaptureNotePatch = {};
    if (b['doc'] !== undefined) {
      if (!isDoc(b['doc'])) return badRequest('doc must be a TipTap document object');
      patch.doc_json = JSON.stringify(b['doc']);
    }
    if (b['text'] !== undefined) patch.text = typeof b['text'] === 'string' ? b['text'] : '';
    if (b['title'] !== undefined) {
      patch.title = typeof b['title'] === 'string' && b['title'].trim() ? b['title'].trim() : null;
    }
    if (b['status'] !== undefined) {
      if (b['status'] !== 'inbox' && b['status'] !== 'archived') {
        return badRequest("status must be 'inbox' or 'archived'");
      }
      patch.status = b['status'];
    }
    if (b['meta'] !== undefined) patch.meta_json = b['meta'] != null ? JSON.stringify(b['meta']) : null;
    const row = await new CaptureNoteRepo(env.DB_PL).update(id, patch);
    return row ? ok(toApi(row)) : notFound(`capture ${id}`);
  });

  // POST /pl/captures/:id/archive — move a capture out of the inbox
  router.post('/pl/captures/:id/archive', async (_req, env, { id }) => {
    const row = await new CaptureNoteRepo(env.DB_PL).update(id, { status: 'archived' });
    return row ? ok(toApi(row)) : notFound(`capture ${id}`);
  });
}
