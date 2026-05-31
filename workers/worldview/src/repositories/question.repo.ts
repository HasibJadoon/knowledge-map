// ─── QuestionRepo — wv_questions + wv_topics ──────────────────────────────────
// Open questions raised by a source, plus the topic taxonomy. Questions scope to
// a source/unit via meta_json. Canonical per 001_wv_schema.sql.

import { query, queryOne } from '../../../shared/src/db';

export interface WvQuestion {
  id: string;
  question_text: string;
  question_type: string;
  topic_id: string | null;
  status: string;
  meta_json: string | null;
  created_at: string;
}

export interface WvTopic {
  id: string;
  topic_key: string;
  title: string;
  topic_domain: string;
  description_md: string | null;
}

const Q_COLS = `id, question_text, question_type, topic_id, status, meta_json, created_at`;
const T_COLS = `id, topic_key, title, topic_domain, description_md`;

export class QuestionRepo {
  constructor(private db: D1Database) {}

  byUnit(unitId: string): Promise<WvQuestion[]> {
    return query<WvQuestion>(
      this.db,
      `SELECT ${Q_COLS} FROM wv_questions
        WHERE json_extract(meta_json, '$.source_unit_id') = ? ORDER BY created_at`,
      [unitId],
    );
  }

  bySource(sourceId: string): Promise<WvQuestion[]> {
    return query<WvQuestion>(
      this.db,
      `SELECT ${Q_COLS} FROM wv_questions
        WHERE json_extract(meta_json, '$.source_id') = ? ORDER BY created_at`,
      [sourceId],
    );
  }

  findById(id: string): Promise<WvQuestion | null> {
    return queryOne<WvQuestion>(this.db, `SELECT ${Q_COLS} FROM wv_questions WHERE id = ?`, [id]);
  }

  topics(): Promise<WvTopic[]> {
    return query<WvTopic>(this.db, `SELECT ${T_COLS} FROM wv_topics ORDER BY title`, []);
  }

  topicById(id: string): Promise<WvTopic | null> {
    return queryOne<WvTopic>(this.db, `SELECT ${T_COLS} FROM wv_topics WHERE id = ?`, [id]);
  }
}
