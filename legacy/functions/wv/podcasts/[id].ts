import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
}

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const id = ctx.params['id'] as string;
    if (!id) {
      return new Response(
        JSON.stringify({ ok: false, error: 'id is required' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const podcast = await ctx.env.DB.prepare(
      `SELECT * FROM wv_podcast WHERE id = ?1`
    )
      .bind(id)
      .first();

    if (!podcast) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Podcast not found' }),
        { status: 404, headers: jsonHeaders }
      );
    }

    const { results: participants } = await ctx.env.DB.prepare(
      `SELECT * FROM wv_podcast_participant WHERE podcast_id = ?1 ORDER BY sort_order ASC, id ASC`
    )
      .bind(id)
      .all();

    const { results: talkingPoints } = await ctx.env.DB.prepare(
      `SELECT * FROM wv_podcast_talking_point WHERE podcast_id = ?1 ORDER BY sort_order ASC, id ASC`
    )
      .bind(id)
      .all();

    return new Response(
      JSON.stringify({
        ok: true,
        podcast,
        participants: participants ?? [],
        talkingPoints: talkingPoints ?? [],
      }),
      { headers: jsonHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? String(err) }),
      { status: 500, headers: jsonHeaders }
    );
  }
};

export const onRequestPut: PagesFunction<Env> = async (ctx) => {
  try {
    const id = ctx.params['id'] as string;
    if (!id) {
      return new Response(
        JSON.stringify({ ok: false, error: 'id is required' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    let body: any;
    try {
      body = await ctx.request.json();
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid JSON body' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const existing = await ctx.env.DB.prepare(
      `SELECT id FROM wv_podcast WHERE id = ?1`
    )
      .bind(id)
      .first();

    if (!existing) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Podcast not found' }),
        { status: 404, headers: jsonHeaders }
      );
    }

    const stringFields = [
      'title',
      'description',
      'type',
      'status',
      'doc_id',
      'recorded_at',
      'published_url',
    ] as const;

    const setCols: string[] = [];
    const binds: (string | null)[] = [];
    let bindIdx = 1;

    for (const field of stringFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        setCols.push(`${field} = ?${bindIdx++}`);
        binds.push(typeof body[field] === 'string' ? body[field].trim() || null : null);
      }
    }

    if (!setCols.length) {
      return new Response(
        JSON.stringify({ ok: false, error: 'No fields to update' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    setCols.push(`updated_at = datetime('now')`);
    binds.push(id);

    await ctx.env.DB.prepare(
      `UPDATE wv_podcast SET ${setCols.join(', ')} WHERE id = ?${bindIdx}`
    )
      .bind(...binds)
      .run();

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: jsonHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? String(err) }),
      { status: 500, headers: jsonHeaders }
    );
  }
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    const id = ctx.params['id'] as string;
    if (!id) {
      return new Response(
        JSON.stringify({ ok: false, error: 'id is required' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const url = new URL(ctx.request.url);
    // Determine sub-action from URL segments after the podcast id
    const pathParts = url.pathname.split('/').filter(Boolean);
    const lastSegment = pathParts[pathParts.length - 1];

    // Check podcast exists
    const podcast = await ctx.env.DB.prepare(
      `SELECT id, type FROM wv_podcast WHERE id = ?1`
    )
      .bind(id)
      .first<{ id: string | number; type: string | null }>();

    if (!podcast) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Podcast not found' }),
        { status: 404, headers: jsonHeaders }
      );
    }

    let body: any;
    try {
      body = await ctx.request.json();
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid JSON body' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    // POST /wv/podcasts/:id/participants
    if (lastSegment === 'participants') {
      const personId = typeof body?.person_id === 'string' ? body.person_id.trim() || null : null;
      const scholarId = typeof body?.scholar_id === 'string' ? body.scholar_id.trim() || null : null;
      const name = typeof body?.name === 'string' ? body.name.trim() || null : null;
      const role = typeof body?.role === 'string' ? body.role.trim() || null : null;
      const sortOrder = typeof body?.sort_order === 'number' ? body.sort_order : null;

      // Visibility check: if person_id provided, verify the person is not private
      // for workspace-level podcasts. Personal solo podcasts (type='solo') bypass this.
      if (personId && podcast.type !== 'solo') {
        const person = await ctx.env.DB.prepare(
          `SELECT visibility FROM wv_person WHERE id = ?1`
        )
          .bind(personId)
          .first<{ visibility: string | null }>();

        if (!person) {
          return new Response(
            JSON.stringify({ ok: false, error: 'Person not found' }),
            { status: 404, headers: jsonHeaders }
          );
        }

        if (person.visibility === 'private') {
          return new Response(
            JSON.stringify({
              ok: false,
              error: 'Cannot add a private contact to a workspace-level podcast',
            }),
            { status: 403, headers: jsonHeaders }
          );
        }
      }

      const result = await ctx.env.DB.prepare(
        `INSERT INTO wv_podcast_participant (podcast_id, person_id, scholar_id, name, role, sort_order, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now'))`
      )
        .bind(id, personId, scholarId, name, role, sortOrder)
        .run();

      const participantId = result.meta?.last_row_id ?? null;

      return new Response(
        JSON.stringify({ ok: true, id: participantId }),
        { status: 201, headers: jsonHeaders }
      );
    }

    // POST /wv/podcasts/:id/talking-points
    if (lastSegment === 'talking-points') {
      const content = typeof body?.content === 'string' ? body.content.trim() : '';
      if (!content) {
        return new Response(
          JSON.stringify({ ok: false, error: 'content is required' }),
          { status: 400, headers: jsonHeaders }
        );
      }

      const sourceId = typeof body?.source_id === 'string' ? body.source_id.trim() || null : null;
      const unitId = typeof body?.unit_id === 'string' ? body.unit_id.trim() || null : null;
      const highlightId = typeof body?.highlight_id === 'string' ? body.highlight_id.trim() || null : null;
      const surah = typeof body?.surah === 'number' ? body.surah : null;
      const ayahFrom = typeof body?.ayah_from === 'number' ? body.ayah_from : null;
      const ayahTo = typeof body?.ayah_to === 'number' ? body.ayah_to : null;
      const sortOrder = typeof body?.sort_order === 'number' ? body.sort_order : null;
      const durationMins = typeof body?.duration_mins === 'number' ? body.duration_mins : null;

      const result = await ctx.env.DB.prepare(
        `INSERT INTO wv_podcast_talking_point
          (podcast_id, content, source_id, unit_id, highlight_id, surah, ayah_from, ayah_to, sort_order, duration_mins, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, datetime('now'))`
      )
        .bind(id, content, sourceId, unitId, highlightId, surah, ayahFrom, ayahTo, sortOrder, durationMins)
        .run();

      const tpId = result.meta?.last_row_id ?? null;

      return new Response(
        JSON.stringify({ ok: true, id: tpId }),
        { status: 201, headers: jsonHeaders }
      );
    }

    return new Response(
      JSON.stringify({ ok: false, error: 'Unknown sub-resource' }),
      { status: 404, headers: jsonHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? String(err) }),
      { status: 500, headers: jsonHeaders }
    );
  }
};
