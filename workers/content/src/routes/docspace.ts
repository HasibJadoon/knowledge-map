// ─── /cm/docspace routes — owner-scoped Doc Space notes (cm_notes) ────────────
// The single canonical note surface for the native app. Ownership is derived
// from the gateway's verified X-KM-User-Id header (never trusted from the body).
// Visibility: 'private' (owner only) | 'workspace' | 'public'. Optional typed
// anchor (domain + surah/ayah) turns any content screen's "Add Note" into a
// filter, not a new table.

import type { Router } from '../../../shared/src/router';
import { ok, created, notFound, badRequest, unauthorized, noContent } from '../../../shared/src/response';
import { query, queryOne, execute } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { ContentEnv } from '../env';

interface DocNote {
  id: string;
  title: string | null;
  body: string;
  visibility: string;
  domain: string | null;
  surah: number | null;
  ayah_from: number | null;
  ayah_to: number | null;
  is_pinned: number;
  created_at: string;
  updated_at: string;
}

const SELECT = `
  SELECT note_id AS id, title, body_text AS body, visibility, domain,
         surah, ayah_from, ayah_to, is_pinned, created_at, updated_at
  FROM cm_notes`;

function ownerOf(req: Request): string | null {
  return req.headers.get('X-KM-User-Id');
}

function intOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

export function docSpaceRoutes(router: Router<ContentEnv>) {

  // GET /cm/docspace?domain=&surah=&visibility=&q=  — my notes (+ public)
  router.get('/cm/docspace', async (req, env) => {
    const owner = ownerOf(req);
    if (!owner) return unauthorized('Sign in required');
    const url = new URL(req.url);
    const domain = url.searchParams.get('domain');
    const surah = intOrNull(url.searchParams.get('surah'));
    const scope = url.searchParams.get('visibility'); // 'mine' default | 'public' | 'workspace'
    const q = url.searchParams.get('q')?.trim();

    const where: string[] = [];
    const params: unknown[] = [];
    if (scope === 'public') {
      where.push(`visibility = 'public'`);
    } else if (scope === 'workspace') {
      where.push(`visibility = 'workspace'`);
    } else {
      where.push(`core_user_ref = ?`);
      params.push(owner);
    }
    if (domain) { where.push(`domain = ?`); params.push(domain); }
    if (surah !== null) { where.push(`surah = ?`); params.push(surah); }
    if (q) { where.push(`(title LIKE ? OR body_text LIKE ?)`); params.push(`%${q}%`, `%${q}%`); }

    const rows = await query<DocNote>(
      env.DB_CM,
      `${SELECT} WHERE ${where.join(' AND ')} ORDER BY is_pinned DESC, updated_at DESC LIMIT 500`,
      params,
    );
    return ok({ notes: rows });
  });

  // GET /cm/docspace/:id
  router.get('/cm/docspace/:id', async (req, env, { id }) => {
    const owner = ownerOf(req);
    if (!owner) return unauthorized('Sign in required');
    const row = await queryOne<DocNote>(
      env.DB_CM,
      `${SELECT} WHERE note_id = ? AND (core_user_ref = ? OR visibility = 'public')`,
      [id, owner],
    );
    return row ? ok(row) : notFound(`note ${id}`);
  });

  // POST /cm/docspace
  router.post('/cm/docspace', async (req, env) => {
    const owner = ownerOf(req);
    if (!owner) return unauthorized('Sign in required');
    let b: Record<string, unknown>;
    try { b = (await req.json() ?? {}) as Record<string, unknown>; }
    catch { return badRequest('Request body must be valid JSON'); }

    const id = typedId('CM');
    const visibility = typeof b['visibility'] === 'string' ? b['visibility'] : 'private';
    await execute(
      env.DB_CM,
      `INSERT INTO cm_notes
         (note_id, core_user_ref, note_type, title, body_text, is_pinned,
          tags_json, meta_json, visibility, domain, surah, ayah_from, ayah_to,
          created_at, updated_at)
       VALUES (?, ?, 'note', ?, ?, 0, '[]', '{}', ?, ?, ?, ?, ?,
               strftime('%Y-%m-%dT%H:%M:%SZ','now'), strftime('%Y-%m-%dT%H:%M:%SZ','now'))`,
      [
        id, owner,
        (b['title'] as string | null) ?? null,
        String(b['body'] ?? ''),
        visibility,
        (b['domain'] as string | null) ?? null,
        intOrNull(b['surah']), intOrNull(b['ayah_from']), intOrNull(b['ayah_to']),
      ],
    );
    const row = await queryOne<DocNote>(env.DB_CM, `${SELECT} WHERE note_id = ?`, [id]);
    return created(row);
  });

  // PATCH /cm/docspace/:id  (owner only)
  router.patch('/cm/docspace/:id', async (req, env, { id }) => {
    const owner = ownerOf(req);
    if (!owner) return unauthorized('Sign in required');
    let b: Record<string, unknown>;
    try { b = (await req.json() ?? {}) as Record<string, unknown>; }
    catch { return badRequest('Request body must be valid JSON'); }

    const sets: string[] = [];
    const params: unknown[] = [];
    if (b['title'] !== undefined) { sets.push('title = ?'); params.push(b['title'] as string | null); }
    if (b['body'] !== undefined) { sets.push('body_text = ?'); params.push(String(b['body'])); }
    if (b['visibility'] !== undefined) { sets.push('visibility = ?'); params.push(String(b['visibility'])); }
    if (b['is_pinned'] !== undefined) { sets.push('is_pinned = ?'); params.push(b['is_pinned'] ? 1 : 0); }
    if (b['domain'] !== undefined) { sets.push('domain = ?'); params.push((b['domain'] as string | null) ?? null); }
    if (b['surah'] !== undefined) { sets.push('surah = ?'); params.push(intOrNull(b['surah'])); }
    if (b['ayah_from'] !== undefined) { sets.push('ayah_from = ?'); params.push(intOrNull(b['ayah_from'])); }
    if (b['ayah_to'] !== undefined) { sets.push('ayah_to = ?'); params.push(intOrNull(b['ayah_to'])); }
    if (!sets.length) return badRequest('No fields to update');
    sets.push(`updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')`);

    const res = await execute(
      env.DB_CM,
      `UPDATE cm_notes SET ${sets.join(', ')} WHERE note_id = ? AND core_user_ref = ?`,
      [...params, id, owner],
    );
    if (!res.meta.changes) return notFound(`note ${id}`);
    const row = await queryOne<DocNote>(env.DB_CM, `${SELECT} WHERE note_id = ?`, [id]);
    return ok(row);
  });

  // DELETE /cm/docspace/:id  (owner only)
  router.delete('/cm/docspace/:id', async (req, env, { id }) => {
    const owner = ownerOf(req);
    if (!owner) return unauthorized('Sign in required');
    const res = await execute(
      env.DB_CM,
      `DELETE FROM cm_notes WHERE note_id = ? AND core_user_ref = ?`,
      [id, owner],
    );
    return res.meta.changes ? noContent() : notFound(`note ${id}`);
  });
}
