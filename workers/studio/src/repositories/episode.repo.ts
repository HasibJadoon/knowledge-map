// ─── EpisodeRepo — st_episodes + participants + sections + talking points ──────
// An episode is the authored aggregate the builder edits and the live session
// later broadcasts. Sections own ordered talking points; each point may be
// assigned to one participant (the person whose turn it is to speak).

import { query, queryOne, execute } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';

export const EPISODE_FORMATS = ['podcast', 'tutorial', 'talking_head', 'conversation', 'solo'] as const;
export const SECTION_TYPES = ['intro', 'main_point', 'discussion', 'conclusion', 'custom'] as const;
export const PARTICIPANT_ROLES = ['host', 'speaker', 'guest', 'viewer'] as const;
export const EPISODE_STATUSES = ['draft', 'live', 'done'] as const;

const PALETTE = ['#c9a84c', '#4c9fc9', '#c94c7a', '#5cc94c', '#9b6cc9', '#c97a4c'];

// ── Row shapes ────────────────────────────────────────────────────────────────

export interface EpisodeRow {
  id: string;
  core_user_ref: string;
  core_ws_ref: string | null;
  title: string;
  format: string;
  template_ref: string | null;
  status: string;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParticipantRow {
  id: string;
  episode_ref: string;
  display_name: string;
  color: string;
  role: string;
  seq: number;
  core_user_ref: string | null;
  created_at: string;
}

export interface SectionRow {
  id: string;
  episode_ref: string;
  type: string;
  heading: string;
  seq: number;
  created_at: string;
  updated_at: string;
}

export interface PointRow {
  id: string;
  section_ref: string;
  episode_ref: string;
  text: string;
  speaker_ref: string | null;
  est_seconds: number | null;
  seq: number;
  created_at: string;
  updated_at: string;
}

export interface EpisodeAggregate extends EpisodeRow {
  participants: ParticipantRow[];
  sections: Array<SectionRow & { points: PointRow[] }>;
}

// ── Input shapes ──────────────────────────────────────────────────────────────

export interface EpisodeCreate {
  core_user_ref: string;
  core_ws_ref?: string | null;
  title: string;
  format?: string;
  template_ref?: string | null;
}

export interface EpisodePatch {
  title?: string;
  format?: string;
  status?: string;
  meta_json?: string | null;
}

export interface ParticipantInput {
  display_name: string;
  color?: string;
  role?: string;
  seq?: number;
  core_user_ref?: string | null;
}

export interface ParticipantPatch {
  display_name?: string;
  color?: string;
  role?: string;
  seq?: number;
  core_user_ref?: string | null;
}

export interface SectionInput {
  type?: string;
  heading: string;
  seq?: number;
}

export interface SectionPatch {
  type?: string;
  heading?: string;
  seq?: number;
}

export interface PointInput {
  text?: string;
  speaker_ref?: string | null;
  est_seconds?: number | null;
  seq?: number;
}

export interface PointPatch {
  text?: string;
  speaker_ref?: string | null;
  est_seconds?: number | null;
  seq?: number;
}

/** Parsed shape of a template's structure_json blueprint. */
export interface TemplateStructure {
  participants?: Array<{ role?: string; display_name?: string; color?: string }>;
  sections?: Array<{
    type?: string;
    heading?: string;
    points?: Array<{ text?: string; speaker_role?: string | null; est_seconds?: number | null }>;
  }>;
}

const EP_COLS = `id, core_user_ref, core_ws_ref, title, format, template_ref,
                 status, meta_json, created_at, updated_at`;
const PA_COLS = `id, episode_ref, display_name, color, role, seq, core_user_ref, created_at`;
const SE_COLS = `id, episode_ref, type, heading, seq, created_at, updated_at`;
const PT_COLS = `id, section_ref, episode_ref, text, speaker_ref, est_seconds,
                 seq, created_at, updated_at`;

export class EpisodeRepo {
  constructor(private db: D1Database) {}

  // ── Episodes ────────────────────────────────────────────────────────────────

  listEpisodes(userRef: string): Promise<EpisodeRow[]> {
    return query<EpisodeRow>(
      this.db,
      `SELECT ${EP_COLS} FROM st_episodes
       WHERE core_user_ref = ?
       ORDER BY created_at DESC`,
      [userRef],
    );
  }

  findEpisode(id: string): Promise<EpisodeRow | null> {
    return queryOne<EpisodeRow>(
      this.db, `SELECT ${EP_COLS} FROM st_episodes WHERE id = ?`, [id],
    );
  }

  async createEpisode(input: EpisodeCreate): Promise<EpisodeRow> {
    const id = typedId('ST');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO st_episodes
         (id, core_user_ref, core_ws_ref, title, format, template_ref,
          status, meta_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'draft', NULL, ?, ?)`,
      [
        id,
        input.core_user_ref,
        input.core_ws_ref ?? null,
        input.title,
        input.format ?? 'podcast',
        input.template_ref ?? null,
        now,
        now,
      ],
    );
    return (await this.findEpisode(id))!;
  }

  async patchEpisode(id: string, patch: EpisodePatch): Promise<EpisodeRow | null> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (patch.title !== undefined)     { sets.push('title = ?');     vals.push(patch.title); }
    if (patch.format !== undefined)    { sets.push('format = ?');    vals.push(patch.format); }
    if (patch.status !== undefined)    { sets.push('status = ?');    vals.push(patch.status); }
    if (patch.meta_json !== undefined) { sets.push('meta_json = ?'); vals.push(patch.meta_json); }
    if (sets.length === 0) return this.findEpisode(id);
    sets.push('updated_at = ?');
    vals.push(new Date().toISOString());
    vals.push(id);
    await execute(this.db, `UPDATE st_episodes SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findEpisode(id);
  }

  async deleteEpisode(id: string): Promise<boolean> {
    await execute(this.db, `DELETE FROM st_talking_points WHERE episode_ref = ?`, [id]);
    await execute(this.db, `DELETE FROM st_sections WHERE episode_ref = ?`, [id]);
    await execute(this.db, `DELETE FROM st_participants WHERE episode_ref = ?`, [id]);
    const res = await execute(this.db, `DELETE FROM st_episodes WHERE id = ?`, [id]);
    return (res.meta.changes ?? 0) > 0;
  }

  async findAggregate(id: string): Promise<EpisodeAggregate | null> {
    const episode = await this.findEpisode(id);
    if (!episode) return null;

    const [participants, sections, points] = await Promise.all([
      query<ParticipantRow>(
        this.db,
        `SELECT ${PA_COLS} FROM st_participants WHERE episode_ref = ? ORDER BY seq ASC`,
        [id],
      ),
      query<SectionRow>(
        this.db,
        `SELECT ${SE_COLS} FROM st_sections WHERE episode_ref = ? ORDER BY seq ASC`,
        [id],
      ),
      query<PointRow>(
        this.db,
        `SELECT ${PT_COLS} FROM st_talking_points WHERE episode_ref = ? ORDER BY seq ASC`,
        [id],
      ),
    ]);

    const pointsBySection = new Map<string, PointRow[]>();
    for (const point of points) {
      const bucket = pointsBySection.get(point.section_ref) ?? [];
      bucket.push(point);
      pointsBySection.set(point.section_ref, bucket);
    }

    return {
      ...episode,
      participants,
      sections: sections.map((section) => ({
        ...section,
        points: pointsBySection.get(section.id) ?? [],
      })),
    };
  }

  // ── Participants ────────────────────────────────────────────────────────────

  findParticipant(id: string): Promise<ParticipantRow | null> {
    return queryOne<ParticipantRow>(
      this.db, `SELECT ${PA_COLS} FROM st_participants WHERE id = ?`, [id],
    );
  }

  async createParticipant(episodeId: string, input: ParticipantInput): Promise<ParticipantRow> {
    const id = typedId('ST');
    const seq = input.seq ?? await this.nextSeq('st_participants', 'episode_ref', episodeId);
    await execute(
      this.db,
      `INSERT INTO st_participants
         (id, episode_ref, display_name, color, role, seq, core_user_ref, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        episodeId,
        input.display_name,
        input.color ?? PALETTE[seq % PALETTE.length],
        input.role ?? 'speaker',
        seq,
        input.core_user_ref ?? null,
        new Date().toISOString(),
      ],
    );
    return (await this.findParticipant(id))!;
  }

  async patchParticipant(id: string, patch: ParticipantPatch): Promise<ParticipantRow | null> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (patch.display_name !== undefined) { sets.push('display_name = ?'); vals.push(patch.display_name); }
    if (patch.color !== undefined)        { sets.push('color = ?');        vals.push(patch.color); }
    if (patch.role !== undefined)         { sets.push('role = ?');         vals.push(patch.role); }
    if (patch.seq !== undefined)          { sets.push('seq = ?');          vals.push(patch.seq); }
    if (patch.core_user_ref !== undefined) { sets.push('core_user_ref = ?'); vals.push(patch.core_user_ref); }
    if (sets.length === 0) return this.findParticipant(id);
    vals.push(id);
    await execute(this.db, `UPDATE st_participants SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findParticipant(id);
  }

  async deleteParticipant(id: string): Promise<boolean> {
    // Unassign this speaker from any points before removing them.
    await execute(
      this.db,
      `UPDATE st_talking_points SET speaker_ref = NULL WHERE speaker_ref = ?`,
      [id],
    );
    const res = await execute(this.db, `DELETE FROM st_participants WHERE id = ?`, [id]);
    return (res.meta.changes ?? 0) > 0;
  }

  // ── Sections ────────────────────────────────────────────────────────────────

  findSection(id: string): Promise<SectionRow | null> {
    return queryOne<SectionRow>(
      this.db, `SELECT ${SE_COLS} FROM st_sections WHERE id = ?`, [id],
    );
  }

  async createSection(episodeId: string, input: SectionInput): Promise<SectionRow> {
    const id = typedId('ST');
    const now = new Date().toISOString();
    const seq = input.seq ?? await this.nextSeq('st_sections', 'episode_ref', episodeId);
    await execute(
      this.db,
      `INSERT INTO st_sections (id, episode_ref, type, heading, seq, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, episodeId, input.type ?? 'custom', input.heading, seq, now, now],
    );
    return (await this.findSection(id))!;
  }

  async patchSection(id: string, patch: SectionPatch): Promise<SectionRow | null> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (patch.type !== undefined)    { sets.push('type = ?');    vals.push(patch.type); }
    if (patch.heading !== undefined) { sets.push('heading = ?'); vals.push(patch.heading); }
    if (patch.seq !== undefined)     { sets.push('seq = ?');     vals.push(patch.seq); }
    if (sets.length === 0) return this.findSection(id);
    sets.push('updated_at = ?');
    vals.push(new Date().toISOString());
    vals.push(id);
    await execute(this.db, `UPDATE st_sections SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findSection(id);
  }

  async deleteSection(id: string): Promise<boolean> {
    await execute(this.db, `DELETE FROM st_talking_points WHERE section_ref = ?`, [id]);
    const res = await execute(this.db, `DELETE FROM st_sections WHERE id = ?`, [id]);
    return (res.meta.changes ?? 0) > 0;
  }

  // ── Talking points ──────────────────────────────────────────────────────────

  findPoint(id: string): Promise<PointRow | null> {
    return queryOne<PointRow>(
      this.db, `SELECT ${PT_COLS} FROM st_talking_points WHERE id = ?`, [id],
    );
  }

  async createPoint(sectionId: string, episodeId: string, input: PointInput): Promise<PointRow> {
    const id = typedId('ST');
    const now = new Date().toISOString();
    const seq = input.seq ?? await this.nextSeq('st_talking_points', 'section_ref', sectionId);
    await execute(
      this.db,
      `INSERT INTO st_talking_points
         (id, section_ref, episode_ref, text, speaker_ref, est_seconds, seq, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        sectionId,
        episodeId,
        input.text ?? '',
        input.speaker_ref ?? null,
        input.est_seconds ?? null,
        seq,
        now,
        now,
      ],
    );
    return (await this.findPoint(id))!;
  }

  async patchPoint(id: string, patch: PointPatch): Promise<PointRow | null> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (patch.text !== undefined)        { sets.push('text = ?');        vals.push(patch.text); }
    if (patch.speaker_ref !== undefined) { sets.push('speaker_ref = ?'); vals.push(patch.speaker_ref); }
    if (patch.est_seconds !== undefined) { sets.push('est_seconds = ?'); vals.push(patch.est_seconds); }
    if (patch.seq !== undefined)         { sets.push('seq = ?');         vals.push(patch.seq); }
    if (sets.length === 0) return this.findPoint(id);
    sets.push('updated_at = ?');
    vals.push(new Date().toISOString());
    vals.push(id);
    await execute(this.db, `UPDATE st_talking_points SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findPoint(id);
  }

  async deletePoint(id: string): Promise<boolean> {
    const res = await execute(this.db, `DELETE FROM st_talking_points WHERE id = ?`, [id]);
    return (res.meta.changes ?? 0) > 0;
  }

  // ── Template expansion ──────────────────────────────────────────────────────

  /** Materialise a template blueprint into participant / section / point rows. */
  async applyStructure(episodeId: string, structure: TemplateStructure): Promise<void> {
    const roleToId = new Map<string, string>();

    const participants = structure.participants ?? [];
    for (let i = 0; i < participants.length; i++) {
      const p = participants[i];
      const created = await this.createParticipant(episodeId, {
        display_name: (p.display_name ?? '').trim() || `Person ${i + 1}`,
        color: p.color || PALETTE[i % PALETTE.length],
        role: i === 0 ? 'host' : 'speaker',
        seq: i,
      });
      if (p.role) roleToId.set(p.role, created.id);
    }

    const sections = structure.sections ?? [];
    for (let s = 0; s < sections.length; s++) {
      const sec = sections[s];
      const section = await this.createSection(episodeId, {
        type: sec.type || 'custom',
        heading: (sec.heading ?? '').trim() || 'Section',
        seq: s,
      });
      const points = sec.points ?? [];
      for (let p = 0; p < points.length; p++) {
        const pt = points[p];
        await this.createPoint(section.id, episodeId, {
          text: pt.text ?? '',
          speaker_ref: pt.speaker_role ? roleToId.get(pt.speaker_role) ?? null : null,
          est_seconds: pt.est_seconds ?? null,
          seq: p,
        });
      }
    }
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  /** Next append position for a child collection. table / refCol are constants. */
  private async nextSeq(table: string, refCol: string, refVal: string): Promise<number> {
    const row = await queryOne<{ next: number }>(
      this.db,
      `SELECT COALESCE(MAX(seq), -1) + 1 AS next FROM ${table} WHERE ${refCol} = ?`,
      [refVal],
    );
    return row?.next ?? 0;
  }
}
