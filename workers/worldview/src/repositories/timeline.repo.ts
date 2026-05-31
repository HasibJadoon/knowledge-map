// ─── TimelineRepo — wv_timeline_events ────────────────────────────────────────
// Era ranges + dated incidents. Scoped to a source/unit via meta_json so the
// reader can fetch a book's timeline. Canonical per 001_wv_schema.sql.

import { query, queryOne } from '../../../shared/src/db';

export interface WvTimelineEvent {
  id: string;
  title: string;
  event_type: string;        // era | incident | historical | ...
  year_exact: number | null;
  year_start: number | null;
  year_end: number | null;
  century: number | null;
  description_md: string | null;
  significance: string | null;
  meta_json: string | null;
  created_at: string;
}

const COLS = `
  id, title, event_type, year_exact, year_start, year_end, century,
  description_md, significance, meta_json, created_at
`.trim().replace(/\n\s+/g, ' ');

export class TimelineRepo {
  constructor(private db: D1Database) {}

  /** All timeline events scoped to a source (via meta_json.source_id). */
  bySource(sourceId: string): Promise<WvTimelineEvent[]> {
    return query<WvTimelineEvent>(
      this.db,
      `SELECT ${COLS} FROM wv_timeline_events
        WHERE json_extract(meta_json, '$.source_id') = ?
        ORDER BY COALESCE(year_start, year_exact), event_type`,
      [sourceId],
    );
  }

  /** Events scoped to a specific source unit (via meta_json.source_unit_id). */
  byUnit(unitId: string): Promise<WvTimelineEvent[]> {
    return query<WvTimelineEvent>(
      this.db,
      `SELECT ${COLS} FROM wv_timeline_events
        WHERE json_extract(meta_json, '$.source_unit_id') = ?
        ORDER BY COALESCE(year_start, year_exact), event_type`,
      [unitId],
    );
  }

  findById(id: string): Promise<WvTimelineEvent | null> {
    return queryOne<WvTimelineEvent>(
      this.db, `SELECT ${COLS} FROM wv_timeline_events WHERE id = ?`, [id],
    );
  }
}
