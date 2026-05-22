// ─── SessionRepo — st_sessions ────────────────────────────────────────────────
// A session is one live run of an episode. This table is the durable index that
// maps a typed-in room code to a session; the live synced cursor lives in the
// EpisodeSession Durable Object.

import { queryOne, execute } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';

export interface SessionRow {
  id: string;
  episode_ref: string;
  core_user_ref: string;
  room_code: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  snapshot_json: string | null;
  created_at: string;
}

const COLS = `id, episode_ref, core_user_ref, room_code, status,
              started_at, ended_at, snapshot_json, created_at`;

// Room-code alphabet — excludes 0/O/1/I/L so codes are unambiguous when typed.
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

function randomCode(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = '';
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

export class SessionRepo {
  constructor(private db: D1Database) {}

  findByCode(code: string): Promise<SessionRow | null> {
    return queryOne<SessionRow>(
      this.db, `SELECT ${COLS} FROM st_sessions WHERE room_code = ?`, [code],
    );
  }

  findById(id: string): Promise<SessionRow | null> {
    return queryOne<SessionRow>(
      this.db, `SELECT ${COLS} FROM st_sessions WHERE id = ?`, [id],
    );
  }

  /** The episode's current live session, if one is already running. */
  findLiveByEpisode(episodeRef: string): Promise<SessionRow | null> {
    return queryOne<SessionRow>(
      this.db,
      `SELECT ${COLS} FROM st_sessions
       WHERE episode_ref = ? AND status = 'live'
       ORDER BY created_at DESC LIMIT 1`,
      [episodeRef],
    );
  }

  async create(episodeRef: string, userRef: string): Promise<SessionRow> {
    const id = typedId('ST');
    const now = new Date().toISOString();
    // Retry on the (very unlikely) event of a room-code collision.
    for (let attempt = 0; attempt < 6; attempt++) {
      const code = randomCode();
      if (await this.findByCode(code)) continue;
      await execute(
        this.db,
        `INSERT INTO st_sessions
           (id, episode_ref, core_user_ref, room_code, status, started_at, created_at)
         VALUES (?, ?, ?, ?, 'live', ?, ?)`,
        [id, episodeRef, userRef, code, now, now],
      );
      return (await this.findById(id))!;
    }
    throw new Error('Could not allocate a unique room code');
  }

  async end(id: string, snapshotJson: string | null = null): Promise<void> {
    await execute(
      this.db,
      `UPDATE st_sessions SET status = 'ended', ended_at = ?, snapshot_json = ? WHERE id = ?`,
      [new Date().toISOString(), snapshotJson, id],
    );
  }
}
