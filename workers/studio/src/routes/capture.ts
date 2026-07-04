// ─── /st capture-log routes — talking-point capture log ───────────────────────
// A capture session is one recording pass over an episode. Each marker is one
// take of one talking point, with in/out timecodes and a good/redo/skip verdict
// — the editor's shot log. The episode owner starts a session; markers are then
// appended (or replaced wholesale) and individually edited as takes come in.

import type { Router } from '../../../shared/src/router';
import {
  ok, created, notFound, badRequest, unauthorized, forbidden,
} from '../../../shared/src/response';
import type { StudioEnv } from '../env';
import { EpisodeRepo } from '../repositories/episode.repo';
import {
  CaptureRepo, CAPTURE_CONCEPTS, MARKER_STATUSES,
  type MarkerInput, type MarkerPatch,
} from '../repositories/capture.repo';
import { actorRef } from '../auth';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function trimmedString(v: unknown): string | undefined {
  return typeof v === 'string' ? v.trim() : undefined;
}

/** Coerce one raw marker object into a MarkerInput, or null when invalid. */
function toMarkerInput(raw: unknown): MarkerInput | null {
  if (!isObj(raw)) return null;
  const pointRef = trimmedString(raw['point_ref']) || '';
  if (!pointRef) return null;
  const status = trimmedString(raw['status']);
  if (status !== undefined && !(MARKER_STATUSES as readonly string[]).includes(status)) {
    return null;
  }
  return {
    point_ref: pointRef,
    section_ref: trimmedString(raw['section_ref']) ?? null,
    take_number: typeof raw['take_number'] === 'number' ? raw['take_number'] : undefined,
    start_tc: trimmedString(raw['start_tc']) ?? null,
    end_tc: trimmedString(raw['end_tc']) ?? null,
    status,
    note: trimmedString(raw['note']) ?? null,
    clip_ref: trimmedString(raw['clip_ref']) ?? null,
    seq: typeof raw['seq'] === 'number' ? raw['seq'] : undefined,
  };
}

export function captureRoutes(router: Router<StudioEnv>) {

  // POST /st/episodes/:id/captures — start a capture session (owner only)
  router.post('/st/episodes/:id/captures', async (req, env, { id }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const body = await readJson(req);

    const episode = await new EpisodeRepo(env.DB_ST).findEpisode(id);
    if (!episode) return notFound(`episode ${id}`);
    if (episode.core_user_ref !== user) return forbidden('Only the owner can start a capture');

    let concept = 'talking_head';
    if (isObj(body) && body['concept'] !== undefined) {
      const requested = trimmedString(body['concept']) || '';
      if (!(CAPTURE_CONCEPTS as readonly string[]).includes(requested)) {
        return badRequest(`concept must be one of: ${CAPTURE_CONCEPTS.join(', ')}`);
      }
      concept = requested;
    }

    const session = await new CaptureRepo(env.DB_ST).create(id, user, concept);
    return created(session);
  });

  // GET /st/episodes/:id/captures — list capture sessions for an episode (owner only)
  router.get('/st/episodes/:id/captures', async (req, env, { id }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');

    const episode = await new EpisodeRepo(env.DB_ST).findEpisode(id);
    if (!episode) return notFound(`episode ${id}`);
    if (episode.core_user_ref !== user) return forbidden('Not your episode');

    return ok(await new CaptureRepo(env.DB_ST).listByEpisode(id));
  });

  // GET /st/captures/:id — a capture session plus its markers
  router.get('/st/captures/:id', async (req, env, { id }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');

    const session = await new CaptureRepo(env.DB_ST).findById(id);
    if (!session) return notFound(`capture ${id}`);
    if (session.core_user_ref !== user) return forbidden('Not your capture');

    return ok(session);
  });

  // PATCH /st/captures/:id — update session (ended_at / sync timecode / device)
  router.patch('/st/captures/:id', async (req, env, { id }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const body = await readJson(req);
    if (!isObj(body)) return badRequest('Request body must be a JSON object');

    const repo = new CaptureRepo(env.DB_ST);
    const session = await repo.findSession(id);
    if (!session) return notFound(`capture ${id}`);
    if (session.core_user_ref !== user) return forbidden('Not your capture');

    const patch: { ended_at?: string | null; sync_marker_tc?: string | null; device_json?: string | null } = {};
    if (body['ended_at'] !== undefined) patch.ended_at = trimmedString(body['ended_at']) ?? null;
    if (body['sync_marker_tc'] !== undefined) patch.sync_marker_tc = trimmedString(body['sync_marker_tc']) ?? null;
    if (body['device_json'] !== undefined) patch.device_json = trimmedString(body['device_json']) ?? null;
    return ok(await repo.patch(id, patch));
  });

  // POST /st/captures/:id/markers — replace this session's markers wholesale
  router.post('/st/captures/:id/markers', async (req, env, { id }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const body = await readJson(req);

    const repo = new CaptureRepo(env.DB_ST);
    const session = await repo.findSession(id);
    if (!session) return notFound(`capture ${id}`);
    if (session.core_user_ref !== user) return forbidden('Not your capture');

    // Accept either a bare array or { markers: [...] }.
    const rawMarkers = Array.isArray(body)
      ? body
      : isObj(body) && Array.isArray(body['markers']) ? body['markers'] : null;
    if (!rawMarkers) return badRequest('Request body must be an array of markers or { markers: [...] }');

    const markers: MarkerInput[] = [];
    for (const raw of rawMarkers) {
      const marker = toMarkerInput(raw);
      if (!marker) return badRequest('Each marker requires a point_ref and a valid status (good|redo|skip)');
      markers.push(marker);
    }

    return ok(await repo.replaceMarkers(id, markers));
  });

  // PATCH /st/markers/:id — edit a single marker
  router.patch('/st/markers/:id', async (req, env, { id }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const body = await readJson(req);
    if (!isObj(body)) return badRequest('Request body must be a JSON object');

    const repo = new CaptureRepo(env.DB_ST);
    const marker = await repo.findMarker(id);
    if (!marker) return notFound(`marker ${id}`);

    // Ownership flows through the marker's session.
    const session = await repo.findSession(marker.session_ref);
    if (!session || session.core_user_ref !== user) return forbidden('Not your marker');

    const patch: MarkerPatch = {};
    if (body['point_ref'] !== undefined) {
      const pointRef = trimmedString(body['point_ref']);
      if (!pointRef) return badRequest('point_ref must be a non-empty string');
      patch.point_ref = pointRef;
    }
    if (body['section_ref'] !== undefined) patch.section_ref = trimmedString(body['section_ref']) ?? null;
    if (typeof body['take_number'] === 'number') patch.take_number = body['take_number'];
    if (body['start_tc'] !== undefined) patch.start_tc = trimmedString(body['start_tc']) ?? null;
    if (body['end_tc'] !== undefined) patch.end_tc = trimmedString(body['end_tc']) ?? null;
    if (body['status'] !== undefined) {
      const status = trimmedString(body['status']) || '';
      if (!(MARKER_STATUSES as readonly string[]).includes(status)) {
        return badRequest(`status must be one of: ${MARKER_STATUSES.join(', ')}`);
      }
      patch.status = status;
    }
    if (body['note'] !== undefined) patch.note = trimmedString(body['note']) ?? null;
    if (body['clip_ref'] !== undefined) patch.clip_ref = trimmedString(body['clip_ref']) ?? null;
    if (typeof body['seq'] === 'number') patch.seq = body['seq'];

    return ok(await repo.patchMarker(id, patch));
  });
}
