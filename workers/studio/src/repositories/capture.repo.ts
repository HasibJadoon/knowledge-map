// ─── CaptureRepo — st_capture_sessions + st_capture_markers ───────────────────
// A capture session is one recording pass over an episode's talking points. Each
// marker is one take of one point, with in/out timecodes and a good/redo/skip
// verdict — the editor's shot log. The episode authoring tables are the source
// of truth; this table only references them.

import { query, queryOne, execute, executeBatch } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';

export const CAPTURE_CONCEPTS = ['talking_head', 'continuity', 'log_only'] as const;
export const MARKER_STATUSES = ['good', 'redo', 'skip'] as const;

// ── Row shapes ────────────────────────────────────────────────────────────────

export interface CaptureSessionRow {
  id: string;
  episode_ref: string;
  core_user_ref: string;
  concept: string;
  started_at: string | null;
  ended_at: string | null;
  sync_marker_tc: string | null;
  device_json: string | null;
  created_at: string;
}

export interface CaptureMarkerRow {
  id: string;
  session_ref: string;
  point_ref: string;
  section_ref: string | null;
  take_number: number;
  start_tc: string | null;
  end_tc: string | null;
  status: string;
  note: string | null;
  clip_ref: string | null;
  seq: number;
  created_at: string;
}

export interface CaptureSessionAggregate extends CaptureSessionRow {
  markers: CaptureMarkerRow[];
}

// ── Input shapes ──────────────────────────────────────────────────────────────

export interface CaptureSessionPatch {
  ended_at?: string | null;
  sync_marker_tc?: string | null;
  device_json?: string | null;
}

export interface MarkerInput {
  point_ref: string;
  section_ref?: string | null;
  take_number?: number;
  start_tc?: string | null;
  end_tc?: string | null;
  status?: string;
  note?: string | null;
  clip_ref?: string | null;
  seq?: number;
}

export interface MarkerPatch {
  point_ref?: string;
  section_ref?: string | null;
  take_number?: number;
  start_tc?: string | null;
  end_tc?: string | null;
  status?: string;
  note?: string | null;
  clip_ref?: string | null;
  seq?: number;
}

const CS_COLS = `id, episode_ref, core_user_ref, concept, started_at, ended_at,
                 sync_marker_tc, device_json, created_at`;
const CM_COLS = `id, session_ref, point_ref, section_ref, take_number, start_tc,
                 end_tc, status, note, clip_ref, seq, created_at`;

export class CaptureRepo {
  constructor(private db: D1Database) {}

  // ── Sessions ──────────────────────────────────────────────────────────────

  async create(episodeRef: string, userRef: string, concept: string): Promise<CaptureSessionRow> {
    const id = typedId('ST');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO st_capture_sessions
         (id, episode_ref, core_user_ref, concept, started_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, episodeRef, userRef, concept, now, now],
    );
    return (await this.findSession(id))!;
  }

  findSession(id: string): Promise<CaptureSessionRow | null> {
    return queryOne<CaptureSessionRow>(
      this.db, `SELECT ${CS_COLS} FROM st_capture_sessions WHERE id = ?`, [id],
    );
  }

  /** A capture session plus its markers, ordered by seq. */
  async findById(id: string): Promise<CaptureSessionAggregate | null> {
    const session = await this.findSession(id);
    if (!session) return null;
    const markers = await this.listMarkers(id);
    return { ...session, markers };
  }

  listByEpisode(episodeRef: string): Promise<CaptureSessionRow[]> {
    return query<CaptureSessionRow>(
      this.db,
      `SELECT ${CS_COLS} FROM st_capture_sessions
       WHERE episode_ref = ?
       ORDER BY created_at DESC`,
      [episodeRef],
    );
  }

  async patch(id: string, patch: CaptureSessionPatch): Promise<CaptureSessionRow | null> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (patch.ended_at !== undefined)       { sets.push('ended_at = ?');       vals.push(patch.ended_at); }
    if (patch.sync_marker_tc !== undefined) { sets.push('sync_marker_tc = ?'); vals.push(patch.sync_marker_tc); }
    if (patch.device_json !== undefined)    { sets.push('device_json = ?');    vals.push(patch.device_json); }
    if (sets.length === 0) return this.findSession(id);
    vals.push(id);
    await execute(this.db, `UPDATE st_capture_sessions SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findSession(id);
  }

  // ── Markers ───────────────────────────────────────────────────────────────

  listMarkers(sessionId: string): Promise<CaptureMarkerRow[]> {
    return query<CaptureMarkerRow>(
      this.db,
      `SELECT ${CM_COLS} FROM st_capture_markers WHERE session_ref = ? ORDER BY seq ASC`,
      [sessionId],
    );
  }

  findMarker(id: string): Promise<CaptureMarkerRow | null> {
    return queryOne<CaptureMarkerRow>(
      this.db, `SELECT ${CM_COLS} FROM st_capture_markers WHERE id = ?`, [id],
    );
  }

  /** Replace this session's markers wholesale (delete + bulk insert), atomically. */
  async replaceMarkers(sessionId: string, markers: MarkerInput[]): Promise<CaptureMarkerRow[]> {
    const now = new Date().toISOString();
    const statements: Array<{ sql: string; params?: unknown[] }> = [
      { sql: `DELETE FROM st_capture_markers WHERE session_ref = ?`, params: [sessionId] },
    ];
    for (let i = 0; i < markers.length; i++) {
      const m = markers[i];
      statements.push({
        sql: `INSERT INTO st_capture_markers
                (id, session_ref, point_ref, section_ref, take_number, start_tc,
                 end_tc, status, note, clip_ref, seq, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [
          typedId('ST'),
          sessionId,
          m.point_ref,
          m.section_ref ?? null,
          m.take_number ?? 1,
          m.start_tc ?? null,
          m.end_tc ?? null,
          m.status ?? 'good',
          m.note ?? null,
          m.clip_ref ?? null,
          m.seq ?? i,
          now,
        ],
      });
    }
    await executeBatch(this.db, statements);
    return this.listMarkers(sessionId);
  }

  async patchMarker(id: string, patch: MarkerPatch): Promise<CaptureMarkerRow | null> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (patch.point_ref !== undefined)   { sets.push('point_ref = ?');   vals.push(patch.point_ref); }
    if (patch.section_ref !== undefined) { sets.push('section_ref = ?'); vals.push(patch.section_ref); }
    if (patch.take_number !== undefined) { sets.push('take_number = ?'); vals.push(patch.take_number); }
    if (patch.start_tc !== undefined)    { sets.push('start_tc = ?');    vals.push(patch.start_tc); }
    if (patch.end_tc !== undefined)      { sets.push('end_tc = ?');      vals.push(patch.end_tc); }
    if (patch.status !== undefined)      { sets.push('status = ?');      vals.push(patch.status); }
    if (patch.note !== undefined)        { sets.push('note = ?');        vals.push(patch.note); }
    if (patch.clip_ref !== undefined)    { sets.push('clip_ref = ?');    vals.push(patch.clip_ref); }
    if (patch.seq !== undefined)         { sets.push('seq = ?');         vals.push(patch.seq); }
    if (sets.length === 0) return this.findMarker(id);
    vals.push(id);
    await execute(this.db, `UPDATE st_capture_markers SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findMarker(id);
  }
}
