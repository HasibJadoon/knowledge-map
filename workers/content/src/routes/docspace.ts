// ─── /cm/docspace routes — owner-scoped Doc Space notes (cm_notes) ────────────
// The single canonical note surface for the native app. Ownership is derived
// from the gateway's verified X-KM-User-Id header (never trusted from the body).
// Visibility: 'private' (owner only) | 'workspace' | 'public'. Optional typed
// anchor (domain + surah/ayah) turns any content screen's "Add Note" into a
// filter, not a new table.

import type { Router } from '../../../shared/src/router';
import { ok, created, notFound, badRequest, unauthorized, noContent } from '../../../shared/src/response';
import { query, queryOne, execute, executeBatch } from '../../../shared/src/db';
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
  tags_json: string | null;
  folder_ref: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

const SELECT = `
  SELECT note_id AS id, title, body_text AS body, visibility, domain,
         surah, ayah_from, ayah_to, is_pinned, tags_json, folder_ref, deleted_at,
         created_at, updated_at
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

  // ── Folders (D6.5) — personal, owner-scoped. Registered BEFORE /:id so the
  //    literal "folders" segment wins over the :id param (router is first-match).
  interface FolderRow {
    id: string; parent_ref: string | null; name: string;
    color: string | null; sort_order: number; created_at: string; updated_at: string;
  }
  const SELECT_FOLDER = `
    SELECT id, parent_ref, name, color, sort_order, created_at, updated_at
    FROM cm_folders`;

  // GET /cm/docspace/folders — my folder tree (flat; client builds the tree).
  router.get('/cm/docspace/folders', async (req, env) => {
    const owner = ownerOf(req);
    if (!owner) return unauthorized('Sign in required');
    const folders = await query<FolderRow>(
      env.DB_CM,
      `${SELECT_FOLDER} WHERE core_user_ref = ? ORDER BY sort_order, name COLLATE NOCASE`,
      [owner],
    );
    return ok({ folders });
  });

  // POST /cm/docspace/folders { name, parent_ref?, color? }
  router.post('/cm/docspace/folders', async (req, env) => {
    const owner = ownerOf(req);
    if (!owner) return unauthorized('Sign in required');
    let b: Record<string, unknown>;
    try { b = (await req.json() ?? {}) as Record<string, unknown>; }
    catch { return badRequest('Request body must be valid JSON'); }
    const name = String(b['name'] ?? '').trim();
    if (!name) return badRequest('name is required');
    const id = typedId('CF');
    await execute(
      env.DB_CM,
      `INSERT INTO cm_folders (id, core_user_ref, parent_ref, name, color, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ','now'), strftime('%Y-%m-%dT%H:%M:%SZ','now'))`,
      [id, owner, (b['parent_ref'] as string | null) ?? null, name,
       (b['color'] as string | null) ?? null, intOrNull(b['sort_order']) ?? 0],
    );
    const row = await queryOne<FolderRow>(env.DB_CM, `${SELECT_FOLDER} WHERE id = ?`, [id]);
    return created(row);
  });

  // PATCH /cm/docspace/folders/:fid
  router.patch('/cm/docspace/folders/:fid', async (req, env, { fid }) => {
    const owner = ownerOf(req);
    if (!owner) return unauthorized('Sign in required');
    let b: Record<string, unknown>;
    try { b = (await req.json() ?? {}) as Record<string, unknown>; }
    catch { return badRequest('Request body must be valid JSON'); }
    const sets: string[] = [];
    const params: unknown[] = [];
    if (b['name'] !== undefined) { sets.push('name = ?'); params.push(String(b['name'])); }
    if (b['parent_ref'] !== undefined) { sets.push('parent_ref = ?'); params.push((b['parent_ref'] as string | null) ?? null); }
    if (b['color'] !== undefined) { sets.push('color = ?'); params.push((b['color'] as string | null) ?? null); }
    if (b['sort_order'] !== undefined) { sets.push('sort_order = ?'); params.push(intOrNull(b['sort_order']) ?? 0); }
    if (!sets.length) return badRequest('No fields to update');
    sets.push(`updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')`);
    const res = await execute(
      env.DB_CM,
      `UPDATE cm_folders SET ${sets.join(', ')} WHERE id = ? AND core_user_ref = ?`,
      [...params, fid, owner],
    );
    if (!res.meta.changes) return notFound(`folder ${fid}`);
    const row = await queryOne<FolderRow>(env.DB_CM, `${SELECT_FOLDER} WHERE id = ?`, [fid]);
    return ok(row);
  });

  // DELETE /cm/docspace/folders/:fid — remove folder + descendants; the notes
  // they held fall back to root (folder_ref = NULL), never deleted.
  router.delete('/cm/docspace/folders/:fid', async (req, env, { fid }) => {
    const owner = ownerOf(req);
    if (!owner) return unauthorized('Sign in required');
    // Gather the subtree (one level of nesting is typical; walk to be safe).
    const all = await query<{ id: string; parent_ref: string | null }>(
      env.DB_CM, `SELECT id, parent_ref FROM cm_folders WHERE core_user_ref = ?`, [owner]);
    const owned = new Set(all.map(f => f.id));
    if (!owned.has(fid)) return notFound(`folder ${fid}`);
    const toDelete = new Set<string>([fid]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const f of all) {
        if (f.parent_ref && toDelete.has(f.parent_ref) && !toDelete.has(f.id)) {
          toDelete.add(f.id); grew = true;
        }
      }
    }
    const ids = [...toDelete];
    const placeholders = ids.map(() => '?').join(',');
    await executeBatch(env.DB_CM, [
      { sql: `UPDATE cm_notes SET folder_ref = NULL WHERE core_user_ref = ? AND folder_ref IN (${placeholders})`, params: [owner, ...ids] },
      { sql: `DELETE FROM cm_folders WHERE core_user_ref = ? AND id IN (${placeholders})`, params: [owner, ...ids] },
    ]);
    return noContent();
  });

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
    const tag = url.searchParams.get('tag')?.trim();
    // tags_json is a JSON array like ["math","logic"]; match the quoted token.
    if (tag) { where.push(`tags_json LIKE ?`); params.push(`%${JSON.stringify(tag)}%`); }
    if (q) {
      // Match typed body, title, AND recognized handwriting (ocr_text).
      where.push(`(title LIKE ? OR body_text LIKE ? OR ocr_text LIKE ?)`);
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    // Trash view vs live; default hides soft-deleted notes.
    if (url.searchParams.get('deleted') === '1') {
      where.push(`deleted_at IS NOT NULL`);
    } else {
      where.push(`deleted_at IS NULL`);
    }
    // Folder scope: 'root' = no folder; an id = that folder; absent = all.
    const folder = url.searchParams.get('folder');
    if (folder === 'root') { where.push(`folder_ref IS NULL`); }
    else if (folder) { where.push(`folder_ref = ?`); params.push(folder); }

    const sort = url.searchParams.get('sort');
    const orderBy = sort === 'created' ? 'created_at DESC'
      : sort === 'title' ? 'title COLLATE NOCASE ASC'
      : 'updated_at DESC';

    const rows = await query<DocNote>(
      env.DB_CM,
      `${SELECT} WHERE ${where.join(' AND ')} ORDER BY is_pinned DESC, ${orderBy} LIMIT 500`,
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
    if (b['ocr_text'] !== undefined) { sets.push('ocr_text = ?'); params.push((b['ocr_text'] as string | null) ?? null); }
    if (b['tags'] !== undefined) {
      const tags = Array.isArray(b['tags'])
        ? (b['tags'] as unknown[]).map(String).map(t => t.trim()).filter(Boolean)
        : [];
      sets.push('tags_json = ?'); params.push(JSON.stringify(tags));
    }
    if (b['folder_ref'] !== undefined) {
      // null = move to root; an id must be one of my folders.
      const fref = b['folder_ref'] === null ? null : String(b['folder_ref']);
      if (fref !== null) {
        const mine = await queryOne(env.DB_CM,
          `SELECT id FROM cm_folders WHERE id = ? AND core_user_ref = ?`, [fref, owner]);
        if (!mine) return badRequest('folder_ref is not your folder');
      }
      sets.push('folder_ref = ?'); params.push(fref);
    }
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

  // DELETE /cm/docspace/:id  (owner only). Soft by default → Recently Deleted.
  // ?purge=1 hard-deletes and cascades the note's ink rows.
  router.delete('/cm/docspace/:id', async (req, env, { id }) => {
    const owner = ownerOf(req);
    if (!owner) return unauthorized('Sign in required');
    const purge = new URL(req.url).searchParams.get('purge') === '1';
    if (purge) {
      await executeBatch(env.DB_CM, [
        { sql: `DELETE FROM cm_doc_ink WHERE note_id = ? AND note_id IN (SELECT note_id FROM cm_notes WHERE note_id = ? AND core_user_ref = ?)`, params: [id, id, owner] },
        { sql: `DELETE FROM cm_notes WHERE note_id = ? AND core_user_ref = ?`, params: [id, owner] },
      ]);
      return noContent();
    }
    const res = await execute(
      env.DB_CM,
      `UPDATE cm_notes SET deleted_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
       WHERE note_id = ? AND core_user_ref = ? AND deleted_at IS NULL`,
      [id, owner],
    );
    return res.meta.changes ? noContent() : notFound(`note ${id}`);
  });

  // POST /cm/docspace/:id/restore — bring a soft-deleted note back.
  router.post('/cm/docspace/:id/restore', async (req, env, { id }) => {
    const owner = ownerOf(req);
    if (!owner) return unauthorized('Sign in required');
    const res = await execute(
      env.DB_CM,
      `UPDATE cm_notes SET deleted_at = NULL WHERE note_id = ? AND core_user_ref = ?`,
      [id, owner],
    );
    if (!res.meta.changes) return notFound(`note ${id}`);
    const row = await queryOne<DocNote>(env.DB_CM, `${SELECT} WHERE note_id = ?`, [id]);
    return ok(row);
  });

  // ── Ink pages (D3) — handwriting layer, owner-scoped via the parent note ──
  const SELECT_INK = `
    SELECT ink_id AS id, note_id, page_index, kmink_json, pk_drawing_b64,
           pk_stale, width, height, updated_at
    FROM cm_doc_ink`;

  async function ownsNote(env: ContentEnv, noteId: string, owner: string): Promise<boolean> {
    const row = await queryOne<{ note_id: string }>(
      env.DB_CM,
      `SELECT note_id FROM cm_notes WHERE note_id = ? AND core_user_ref = ?`,
      [noteId, owner],
    );
    return !!row;
  }

  // GET /cm/docspace/:id/ink — all ink pages for a note.
  router.get('/cm/docspace/:id/ink', async (req, env, { id }) => {
    const owner = ownerOf(req);
    if (!owner) return unauthorized('Sign in required');
    if (!(await ownsNote(env, id, owner))) return notFound(`note ${id}`);
    const pages = await query(env.DB_CM, `${SELECT_INK} WHERE note_id = ? ORDER BY page_index`, [id]);
    return ok({ pages });
  });

  // PUT /cm/docspace/:id/ink/:page — upsert one ink page.
  // pk_stale=0 when the native PKDrawing is included; 1 when only KMInk is
  // (e.g. a web edit), signalling iOS to re-rasterise.
  router.put('/cm/docspace/:id/ink/:page', async (req, env, { id, page }) => {
    const owner = ownerOf(req);
    if (!owner) return unauthorized('Sign in required');
    if (!(await ownsNote(env, id, owner))) return notFound(`note ${id}`);
    let b: Record<string, unknown>;
    try { b = (await req.json() ?? {}) as Record<string, unknown>; }
    catch { return badRequest('Request body must be valid JSON'); }

    const pageIndex = intOrNull(page) ?? 0;
    const kmink = b['kmink_json'];
    if (kmink === undefined || kmink === null) return badRequest('kmink_json is required');
    const kminkStr = typeof kmink === 'string' ? kmink : JSON.stringify(kmink);
    const pkB64 = typeof b['pk_drawing_b64'] === 'string' ? b['pk_drawing_b64'] : null;
    const pkStale = pkB64 ? 0 : 1;

    await execute(
      env.DB_CM,
      `INSERT INTO cm_doc_ink
         (ink_id, note_id, page_index, kmink_json, pk_drawing_b64, pk_stale, width, height, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ','now'))
       ON CONFLICT(note_id, page_index) DO UPDATE SET
         kmink_json = excluded.kmink_json,
         pk_drawing_b64 = excluded.pk_drawing_b64,
         pk_stale = excluded.pk_stale,
         width = excluded.width,
         height = excluded.height,
         updated_at = excluded.updated_at`,
      [typedId('CM'), id, pageIndex, kminkStr, pkB64, pkStale, intOrNull(b['width']), intOrNull(b['height'])],
    );
    const row = await queryOne(env.DB_CM, `${SELECT_INK} WHERE note_id = ? AND page_index = ?`, [id, pageIndex]);
    return ok(row);
  });

  // DELETE /cm/docspace/:id/ink/:page — remove one ink page (owner only).
  // Does NOT renumber remaining pages; the client follows with a reorder if it
  // wants a dense 0..n-1 sequence.
  router.delete('/cm/docspace/:id/ink/:page', async (req, env, { id, page }) => {
    const owner = ownerOf(req);
    if (!owner) return unauthorized('Sign in required');
    if (!(await ownsNote(env, id, owner))) return notFound(`note ${id}`);
    const pageIndex = intOrNull(page);
    if (pageIndex === null) return badRequest('page must be an integer');
    const res = await execute(
      env.DB_CM,
      `DELETE FROM cm_doc_ink WHERE note_id = ? AND page_index = ?`,
      [id, pageIndex],
    );
    return res.meta.changes ? noContent() : notFound(`page ${pageIndex}`);
  });

  // POST /cm/docspace/:id/ink/reorder — body { order: [oldIndex, …] }.
  // The array position becomes the new page_index. Transactional two-pass to
  // dodge the UNIQUE(note_id, page_index) constraint: bump all to +1000, then
  // settle to final indexes — all inside one atomic batch.
  router.post('/cm/docspace/:id/ink/reorder', async (req, env, { id }) => {
    const owner = ownerOf(req);
    if (!owner) return unauthorized('Sign in required');
    if (!(await ownsNote(env, id, owner))) return notFound(`note ${id}`);
    let b: Record<string, unknown>;
    try { b = (await req.json() ?? {}) as Record<string, unknown>; }
    catch { return badRequest('Request body must be valid JSON'); }

    const order = Array.isArray(b['order']) ? (b['order'] as unknown[]).map(Number) : null;
    if (!order || order.some((n) => !Number.isInteger(n))) {
      return badRequest('order must be an array of integer page indexes');
    }
    const existing = (await query<{ page_index: number }>(
      env.DB_CM, `SELECT page_index FROM cm_doc_ink WHERE note_id = ? ORDER BY page_index`, [id],
    )).map((r) => r.page_index);
    // `order` must be a permutation of the existing indexes.
    const sameSet = order.length === existing.length &&
      [...order].sort((x, y) => x - y).every((v, i) => v === existing[i]);
    if (!sameSet) return badRequest('order must be a permutation of existing page indexes');

    const bump = existing.map((idx) => ({
      sql: `UPDATE cm_doc_ink SET page_index = page_index + 1000 WHERE note_id = ? AND page_index = ?`,
      params: [id, idx],
    }));
    const settle = order.map((oldIdx, newIdx) => ({
      sql: `UPDATE cm_doc_ink SET page_index = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE note_id = ? AND page_index = ?`,
      params: [newIdx, id, oldIdx + 1000],
    }));
    await executeBatch(env.DB_CM, [...bump, ...settle]);
    const pages = await query(env.DB_CM, `${SELECT_INK} WHERE note_id = ? ORDER BY page_index`, [id]);
    return ok({ pages });
  });
}
