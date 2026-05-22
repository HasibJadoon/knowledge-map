// ─── EpisodeSession — live-session Durable Object ─────────────────────────────
// One instance per live session. It holds the synced cursor — which section and
// talking point is current — and fans state out to every connected screen over
// Hibernatable WebSockets. The host drives the cursor; viewers only follow.

import type { StudioEnv } from './env';
import { EpisodeRepo, type EpisodeAggregate } from './repositories/episode.repo';
import { SessionRepo } from './repositories/session.repo';

interface Cursor {
  section: number;   // index into episode.sections; -1 = lobby (not started)
  point: number;     // index into section.points;  -1 = section heading only
}

const LOBBY: Cursor = { section: -1, point: -1 };

export class EpisodeSession {
  /** Episode aggregate cache — rebuilt from D1 after hibernation. */
  private snapshot: EpisodeAggregate | null = null;

  constructor(private state: DurableObjectState, private env: StudioEnv) {
    // Auto-reply to client keepalive pings without waking from hibernation.
    try {
      this.state.setWebSocketAutoResponse(
        new WebSocketRequestResponsePair('ping', 'pong'),
      );
    } catch {
      // Older runtimes — keepalive still works, it just wakes the object.
    }
  }

  // ── HTTP entry — only ever the WebSocket upgrade ─────────────────────────────
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    const episodeId = request.headers.get('X-KM-Episode-Id') ?? '';
    const sessionId = request.headers.get('X-KM-Session-Id') ?? '';
    const role = request.headers.get('X-KM-Role') === 'host' ? 'host' : 'viewer';

    await this.ensureInit(episodeId, sessionId);

    const { 0: client, 1: server } = new WebSocketPair();
    this.state.acceptWebSocket(server, [role]);

    const [episode, cursor, paused] = await Promise.all([
      this.getSnapshot(),
      this.getCursor(),
      this.getPaused(),
    ]);

    this.sendTo(server, {
      t: 'sync',
      role,
      episode,
      cursor,
      paused,
      viewers: this.state.getWebSockets().length,
    });
    this.broadcastPresence();

    return new Response(null, { status: 101, webSocket: client });
  }

  // ── Hibernatable WebSocket handlers ─────────────────────────────────────────
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    let msg: { t?: string; section?: number; point?: number };
    try {
      const text = typeof message === 'string' ? message : new TextDecoder().decode(message);
      msg = JSON.parse(text);
    } catch {
      return;
    }
    if (msg.t === 'ping') return;

    // Only the host may drive the deck — viewer messages are ignored.
    if (!this.state.getTags(ws).includes('host')) return;

    switch (msg.t) {
      case 'next':    await this.move(1);  break;
      case 'prev':    await this.move(-1); break;
      case 'goto':    await this.goto(msg.section ?? 0, msg.point ?? -1); break;
      case 'pause':   await this.setPaused(true);  break;
      case 'resume':  await this.setPaused(false); break;
      case 'refresh': await this.refreshSnapshot(); break;
      case 'end':     await this.endSession(); break;
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    // The runtime tears the socket down; just refresh everyone's viewer count.
    this.broadcastPresence(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    try { ws.close(1011, 'error'); } catch { /* already closed */ }
  }

  // ── Cursor navigation ───────────────────────────────────────────────────────
  private async move(delta: number): Promise<void> {
    const episode = await this.getSnapshot();
    if (!episode) return;
    const stops = this.flatten(episode);
    if (stops.length === 0) return;

    const cursor = await this.getCursor();
    let idx = stops.findIndex((c) => c.section === cursor.section && c.point === cursor.point);
    if (idx < 0) idx = delta > 0 ? -1 : 0;  // from the lobby, "next" → first stop
    idx = Math.max(0, Math.min(stops.length - 1, idx + delta));
    await this.setCursor(stops[idx]);
  }

  private async goto(section: number, point: number): Promise<void> {
    const episode = await this.getSnapshot();
    if (!episode) return;
    const stops = this.flatten(episode);
    const match =
      stops.find((c) => c.section === section && c.point === point) ??
      stops.find((c) => c.section === section) ??
      null;
    if (match) await this.setCursor(match);
  }

  /** Ordered list of every reachable cursor stop across the episode. */
  private flatten(episode: EpisodeAggregate): Cursor[] {
    const stops: Cursor[] = [];
    episode.sections.forEach((section, s) => {
      if (section.points.length === 0) {
        stops.push({ section: s, point: -1 });
      } else {
        section.points.forEach((_, p) => stops.push({ section: s, point: p }));
      }
    });
    return stops;
  }

  // ── State ───────────────────────────────────────────────────────────────────
  private async ensureInit(episodeId: string, sessionId: string): Promise<void> {
    if (await this.state.storage.get<string>('episodeId')) return;
    if (!episodeId) return;
    await this.state.storage.put('episodeId', episodeId);
    if (sessionId) await this.state.storage.put('sessionId', sessionId);
    await this.state.storage.put('cursor', LOBBY);
    await this.state.storage.put('paused', false);
    await this.state.storage.put('startedAt', new Date().toISOString());
  }

  private async getSnapshot(): Promise<EpisodeAggregate | null> {
    if (this.snapshot) return this.snapshot;
    const episodeId = await this.state.storage.get<string>('episodeId');
    if (!episodeId) return null;
    this.snapshot = await new EpisodeRepo(this.env.DB_ST).findAggregate(episodeId);
    return this.snapshot;
  }

  private async refreshSnapshot(): Promise<void> {
    this.snapshot = null;
    const episode = await this.getSnapshot();
    this.broadcast({
      t: 'sync',
      episode,
      cursor: await this.getCursor(),
      paused: await this.getPaused(),
      viewers: this.state.getWebSockets().length,
    });
  }

  private async getCursor(): Promise<Cursor> {
    return (await this.state.storage.get<Cursor>('cursor')) ?? LOBBY;
  }

  private async getPaused(): Promise<boolean> {
    return (await this.state.storage.get<boolean>('paused')) ?? false;
  }

  private async setCursor(cursor: Cursor): Promise<void> {
    await this.state.storage.put('cursor', cursor);
    this.broadcast({ t: 'cursor', cursor, paused: await this.getPaused() });
  }

  private async setPaused(paused: boolean): Promise<void> {
    await this.state.storage.put('paused', paused);
    this.broadcast({ t: 'cursor', cursor: await this.getCursor(), paused });
  }

  private async endSession(): Promise<void> {
    const sessionId = await this.state.storage.get<string>('sessionId');
    const episodeId = await this.state.storage.get<string>('episodeId');
    if (sessionId) {
      try { await new SessionRepo(this.env.DB_ST).end(sessionId); } catch { /* best effort */ }
    }
    if (episodeId) {
      try {
        await new EpisodeRepo(this.env.DB_ST).patchEpisode(episodeId, { status: 'done' });
      } catch { /* best effort */ }
    }
    this.broadcast({ t: 'ended' });
    for (const ws of this.state.getWebSockets()) {
      try { ws.close(1000, 'Session ended'); } catch { /* already closed */ }
    }
  }

  // ── Fan-out ─────────────────────────────────────────────────────────────────
  private broadcast(payload: unknown): void {
    const data = JSON.stringify(payload);
    for (const ws of this.state.getWebSockets()) {
      try { ws.send(data); } catch { /* dropped socket */ }
    }
  }

  private broadcastPresence(excluding?: WebSocket): void {
    const sockets = this.state.getWebSockets().filter((ws) => ws !== excluding);
    const data = JSON.stringify({ t: 'presence', viewers: sockets.length });
    for (const ws of sockets) {
      try { ws.send(data); } catch { /* dropped socket */ }
    }
  }

  private sendTo(ws: WebSocket, payload: unknown): void {
    try { ws.send(JSON.stringify(payload)); } catch { /* dropped socket */ }
  }
}
