// ─── /st/sessions routes — live synced sessions ───────────────────────────────
// A session is one live run of an episode. The host starts it, joiners resolve a
// room code, and the WebSocket route upgrades into the EpisodeSession Durable
// Object that keeps every screen in sync.

import type { Router } from '../../../shared/src/router';
import {
  ok, created, badRequest, notFound, unauthorized, forbidden,
} from '../../../shared/src/response';
import type { StudioEnv } from '../env';
import { EpisodeRepo } from '../repositories/episode.repo';
import { SessionRepo } from '../repositories/session.repo';
import { actorRef } from '../auth';

export function sessionRoutes(router: Router<StudioEnv>) {

  // POST /st/episodes/:id/sessions — host starts (or rejoins) a live session
  router.post('/st/episodes/:id/sessions', async (req, env, { id }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');

    const episodeRepo = new EpisodeRepo(env.DB_ST);
    const episode = await episodeRepo.findEpisode(id);
    if (!episode) return notFound(`episode ${id}`);
    if (episode.core_user_ref !== user) return forbidden('Only the owner can start a session');

    const sessionRepo = new SessionRepo(env.DB_ST);
    let session = await sessionRepo.findLiveByEpisode(id);
    if (!session) {
      session = await sessionRepo.create(id, user);
      await episodeRepo.patchEpisode(id, { status: 'live' });
    }
    return created({
      session_id: session.id,
      room_code: session.room_code,
      episode_id: id,
      status: session.status,
      host: true,
    });
  });

  // GET /st/sessions/:code — resolve a room code (used by the join screen)
  router.get('/st/sessions/:code', async (req, env, { code }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');

    const session = await new SessionRepo(env.DB_ST).findByCode(code.toUpperCase());
    if (!session || session.status !== 'live') return notFound(`session ${code}`);

    const episode = await new EpisodeRepo(env.DB_ST).findEpisode(session.episode_ref);
    return ok({
      session_id: session.id,
      room_code: session.room_code,
      episode_id: session.episode_ref,
      episode_title: episode?.title ?? 'Episode',
      status: session.status,
      host: session.core_user_ref === user,
    });
  });

  // GET /st/sessions/:code/live — WebSocket upgrade → EpisodeSession Durable Object
  router.get('/st/sessions/:code/live', async (req, env, { code }) => {
    if (req.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return badRequest('Expected a WebSocket upgrade request');
    }
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');

    const session = await new SessionRepo(env.DB_ST).findByCode(code.toUpperCase());
    if (!session || session.status !== 'live') return notFound(`session ${code}`);

    const role = session.core_user_ref === user ? 'host' : 'viewer';
    const headers = new Headers(req.headers);
    headers.set('X-KM-Episode-Id', session.episode_ref);
    headers.set('X-KM-Session-Id', session.id);
    headers.set('X-KM-Role', role);

    const stub = env.EPISODE_SESSION.get(env.EPISODE_SESSION.idFromName(session.id));
    return stub.fetch(new Request(req.url, { method: 'GET', headers }));
  });
}
