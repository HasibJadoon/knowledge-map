// ─── SurahMeaningRepo — qr_surah_topic_flow + qr_surah_rhetoric_profile +
//     qr_topic_registry + qr_scope_topic + qr_surah_theme_profile +
//     qr_surah_theology_profile + qr_surah_worldview_profile ───────────────

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── Row shapes ─────────────────────────────────────────────────────────────────

export interface TopicRegistry {
  id: string;
  topic_key: string;
  topic_label_en: string;
  topic_label_ar: string | null;
  topic_domain: string;
  note_md: string | null;
  created_at: string;
}

export interface TopicRegistryCreate {
  topic_key: string;
  topic_label_en: string;
  topic_label_ar?: string | null;
  topic_domain: string;
  note_md?: string | null;
}

export interface ScopeTopic {
  id: string;
  topic_id: string;
  scope_type: string;
  surah: number;
  ayah_from: number | null;
  ayah_to: number | null;
  prominence: string;
  note_md: string | null;
  created_at: string;
}

export interface ScopeTopicCreate {
  topic_id: string;
  scope_type: string;
  surah: number;
  ayah_from?: number | null;
  ayah_to?: number | null;
  prominence?: string;
  note_md?: string | null;
}

export interface SurahTopicFlow {
  id: string;
  surah: number;
  flow_index: number;
  ayah_from: number;
  ayah_to: number;
  topic_label: string;
  topic_label_ar: string | null;
  flow_direction: string | null;
  transitions_from_id: string | null;
  note_md: string | null;
  created_at: string;
}

export interface SurahTopicFlowCreate {
  surah: number;
  ayah_from: number;
  ayah_to: number;
  topic_label: string;
  topic_label_ar?: string | null;
  flow_direction?: string | null;
  transitions_from_id?: string | null;
  note_md?: string | null;
}

export interface SurahRhetoricProfile {
  surah: number;
  dominant_mode: string | null;
  clause_density: string | null;
  emphasis_patterns: string | null;
  suspension_use: string | null;
  contrast_patterns: string | null;
  rhetorical_devices: string | null;
  note_md: string | null;
  created_at: string;
}

export interface SurahRhetoricProfileUpsert {
  dominant_mode?: string | null;
  clause_density?: string | null;
  emphasis_patterns?: string | null;
  suspension_use?: string | null;
  contrast_patterns?: string | null;
  rhetorical_devices?: string | null;
  note_md?: string | null;
}

export interface SurahThemeProfile {
  surah: number;
  primary_theme: string;
  secondary_themes: string | null;
  theological_axis: string | null;
  ethical_axis: string | null;
  note_md: string | null;
  created_at: string;
}

export interface SurahThemeProfileUpsert {
  primary_theme?: string;
  secondary_themes?: string | null;
  theological_axis?: string | null;
  ethical_axis?: string | null;
  note_md?: string | null;
}

export interface SurahTheologyProfile {
  surah: number;
  divine_attributes: string | null;
  prophethood_aspects: string | null;
  eschatology_aspects: string | null;
  cosmology_aspects: string | null;
  note_md: string | null;
  created_at: string;
}

export interface SurahTheologyProfileUpsert {
  divine_attributes?: string | null;
  prophethood_aspects?: string | null;
  eschatology_aspects?: string | null;
  cosmology_aspects?: string | null;
  note_md?: string | null;
}

export interface SurahWorldviewProfile {
  surah: number;
  anthropology_notes: string | null;
  value_architecture: string | null;
  moral_universe: string | null;
  divine_human_rel: string | null;
  worldview_tensions: string | null;
  note_md: string | null;
  created_at: string;
}

export interface SurahWorldviewProfileUpsert {
  anthropology_notes?: string | null;
  value_architecture?: string | null;
  moral_universe?: string | null;
  divine_human_rel?: string | null;
  worldview_tensions?: string | null;
  note_md?: string | null;
}

// ── Repo ───────────────────────────────────────────────────────────────────────

export class SurahMeaningRepo {
  constructor(private db: D1Database) {}

  // ── qr_topic_registry ──────────────────────────────────────────────────────

  topicRegistry(opts: PaginateOptions = {}) {
    return paginate<TopicRegistry>(
      this.db,
      `SELECT id, topic_key, topic_label_en, topic_label_ar, topic_domain, note_md, created_at
       FROM qr_topic_registry
       ORDER BY topic_domain, topic_key`,
      `SELECT COUNT(*) AS count FROM qr_topic_registry`,
      [],
      opts,
    );
  }

  findTopicById(id: string): Promise<TopicRegistry | null> {
    return queryOne<TopicRegistry>(
      this.db,
      `SELECT id, topic_key, topic_label_en, topic_label_ar, topic_domain, note_md, created_at
       FROM qr_topic_registry
       WHERE id = ?`,
      [id],
    );
  }

  findTopicBySlug(topicKey: string): Promise<TopicRegistry | null> {
    return queryOne<TopicRegistry>(
      this.db,
      `SELECT id, topic_key, topic_label_en, topic_label_ar, topic_domain, note_md, created_at
       FROM qr_topic_registry
       WHERE topic_key = ?`,
      [topicKey],
    );
  }

  async createTopic(input: TopicRegistryCreate): Promise<TopicRegistry | null> {
    const id = typedId('QR');

    await execute(
      this.db,
      `INSERT INTO qr_topic_registry
         (id, topic_key, topic_label_en, topic_label_ar, topic_domain, note_md)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.topic_key,
        input.topic_label_en,
        input.topic_label_ar ?? null,
        input.topic_domain,
        input.note_md ?? null,
      ],
    );

    return this.findTopicById(id);
  }

  // ── qr_scope_topic ────────────────────────────────────────────────────────

  scopeTopics(scopeRef: { surah: number; scope_type?: string }, opts: PaginateOptions = {}) {
    const whereClause = scopeRef.scope_type
      ? 'WHERE surah = ? AND scope_type = ?'
      : 'WHERE surah = ?';
    const params = scopeRef.scope_type
      ? [scopeRef.surah, scopeRef.scope_type]
      : [scopeRef.surah];

    return paginate<ScopeTopic>(
      this.db,
      `SELECT id, topic_id, scope_type, surah, ayah_from, ayah_to, prominence, note_md, created_at
       FROM qr_scope_topic
       ${whereClause}
       ORDER BY prominence, created_at`,
      `SELECT COUNT(*) AS count FROM qr_scope_topic ${whereClause}`,
      params,
      opts,
    );
  }

  async addScopeTopic(input: ScopeTopicCreate): Promise<ScopeTopic | null> {
    const id = typedId('QR');

    await execute(
      this.db,
      `INSERT INTO qr_scope_topic
         (id, topic_id, scope_type, surah, ayah_from, ayah_to, prominence, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.topic_id,
        input.scope_type,
        input.surah,
        input.ayah_from ?? null,
        input.ayah_to ?? null,
        input.prominence ?? 'secondary',
        input.note_md ?? null,
      ],
    );

    return queryOne<ScopeTopic>(
      this.db,
      `SELECT id, topic_id, scope_type, surah, ayah_from, ayah_to, prominence, note_md, created_at
       FROM qr_scope_topic WHERE id = ?`,
      [id],
    );
  }

  // ── qr_surah_topic_flow ───────────────────────────────────────────────────

  topicFlows(surahId: number, opts: PaginateOptions = {}) {
    return paginate<SurahTopicFlow>(
      this.db,
      `SELECT id, surah, flow_index, ayah_from, ayah_to, topic_label, topic_label_ar,
              flow_direction, transitions_from_id, note_md, created_at
       FROM qr_surah_topic_flow
       WHERE surah = ?
       ORDER BY flow_index`,
      `SELECT COUNT(*) AS count FROM qr_surah_topic_flow WHERE surah = ?`,
      [surahId],
      opts,
    );
  }

  async createTopicFlow(input: SurahTopicFlowCreate): Promise<SurahTopicFlow | null> {
    const id = typedId('QR');

    const maxRow = await queryOne<{ max_idx: number | null }>(
      this.db,
      `SELECT MAX(flow_index) AS max_idx FROM qr_surah_topic_flow WHERE surah = ?`,
      [input.surah],
    );
    const flow_index = (maxRow?.max_idx ?? 0) + 1;

    await execute(
      this.db,
      `INSERT INTO qr_surah_topic_flow
         (id, surah, flow_index, ayah_from, ayah_to, topic_label, topic_label_ar,
          flow_direction, transitions_from_id, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.surah,
        flow_index,
        input.ayah_from,
        input.ayah_to,
        input.topic_label,
        input.topic_label_ar ?? null,
        input.flow_direction ?? null,
        input.transitions_from_id ?? null,
        input.note_md ?? null,
      ],
    );

    return queryOne<SurahTopicFlow>(
      this.db,
      `SELECT id, surah, flow_index, ayah_from, ayah_to, topic_label, topic_label_ar,
              flow_direction, transitions_from_id, note_md, created_at
       FROM qr_surah_topic_flow WHERE id = ?`,
      [id],
    );
  }

  // ── qr_surah_rhetoric_profile ─────────────────────────────────────────────

  rhetoricsProfile(surahId: number): Promise<SurahRhetoricProfile | null> {
    return queryOne<SurahRhetoricProfile>(
      this.db,
      `SELECT surah, dominant_mode, clause_density, emphasis_patterns, suspension_use,
              contrast_patterns, rhetorical_devices, note_md, created_at
       FROM qr_surah_rhetoric_profile
       WHERE surah = ?`,
      [surahId],
    );
  }

  async upsertRhetoricProfile(surahId: number, data: SurahRhetoricProfileUpsert): Promise<SurahRhetoricProfile | null> {
    const existing = await this.rhetoricsProfile(surahId);

    if (!existing) {
      await execute(
        this.db,
        `INSERT INTO qr_surah_rhetoric_profile
           (surah, dominant_mode, clause_density, emphasis_patterns, suspension_use,
            contrast_patterns, rhetorical_devices, note_md)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          surahId,
          data.dominant_mode ?? null,
          data.clause_density ?? null,
          data.emphasis_patterns ?? null,
          data.suspension_use ?? null,
          data.contrast_patterns ?? null,
          data.rhetorical_devices ?? null,
          data.note_md ?? null,
        ],
      );
    } else {
      const sets: string[] = [];
      const vals: unknown[] = [];

      if (data.dominant_mode !== undefined)    { sets.push('dominant_mode = ?');    vals.push(data.dominant_mode); }
      if (data.clause_density !== undefined)   { sets.push('clause_density = ?');   vals.push(data.clause_density); }
      if (data.emphasis_patterns !== undefined){ sets.push('emphasis_patterns = ?');vals.push(data.emphasis_patterns); }
      if (data.suspension_use !== undefined)   { sets.push('suspension_use = ?');   vals.push(data.suspension_use); }
      if (data.contrast_patterns !== undefined){ sets.push('contrast_patterns = ?');vals.push(data.contrast_patterns); }
      if (data.rhetorical_devices !== undefined){ sets.push('rhetorical_devices = ?'); vals.push(data.rhetorical_devices); }
      if (data.note_md !== undefined)          { sets.push('note_md = ?');          vals.push(data.note_md); }

      if (sets.length > 0) {
        vals.push(surahId);
        await execute(this.db, `UPDATE qr_surah_rhetoric_profile SET ${sets.join(', ')} WHERE surah = ?`, vals);
      }
    }

    return this.rhetoricsProfile(surahId);
  }

  // ── qr_surah_theme_profile ────────────────────────────────────────────────

  themeProfile(surahId: number): Promise<SurahThemeProfile | null> {
    return queryOne<SurahThemeProfile>(
      this.db,
      `SELECT surah, primary_theme, secondary_themes, theological_axis, ethical_axis,
              note_md, created_at
       FROM qr_surah_theme_profile
       WHERE surah = ?`,
      [surahId],
    );
  }

  async upsertThemeProfile(surahId: number, data: SurahThemeProfileUpsert): Promise<SurahThemeProfile | null> {
    const existing = await this.themeProfile(surahId);

    if (!existing) {
      await execute(
        this.db,
        `INSERT INTO qr_surah_theme_profile
           (surah, primary_theme, secondary_themes, theological_axis, ethical_axis, note_md)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          surahId,
          data.primary_theme ?? '',
          data.secondary_themes ?? null,
          data.theological_axis ?? null,
          data.ethical_axis ?? null,
          data.note_md ?? null,
        ],
      );
    } else {
      const sets: string[] = [];
      const vals: unknown[] = [];

      if (data.primary_theme !== undefined)    { sets.push('primary_theme = ?');    vals.push(data.primary_theme); }
      if (data.secondary_themes !== undefined) { sets.push('secondary_themes = ?'); vals.push(data.secondary_themes); }
      if (data.theological_axis !== undefined) { sets.push('theological_axis = ?'); vals.push(data.theological_axis); }
      if (data.ethical_axis !== undefined)     { sets.push('ethical_axis = ?');     vals.push(data.ethical_axis); }
      if (data.note_md !== undefined)          { sets.push('note_md = ?');          vals.push(data.note_md); }

      if (sets.length > 0) {
        vals.push(surahId);
        await execute(this.db, `UPDATE qr_surah_theme_profile SET ${sets.join(', ')} WHERE surah = ?`, vals);
      }
    }

    return this.themeProfile(surahId);
  }

  // ── qr_surah_theology_profile ─────────────────────────────────────────────

  theologyProfile(surahId: number): Promise<SurahTheologyProfile | null> {
    return queryOne<SurahTheologyProfile>(
      this.db,
      `SELECT surah, divine_attributes, prophethood_aspects, eschatology_aspects,
              cosmology_aspects, note_md, created_at
       FROM qr_surah_theology_profile
       WHERE surah = ?`,
      [surahId],
    );
  }

  async upsertTheologyProfile(surahId: number, data: SurahTheologyProfileUpsert): Promise<SurahTheologyProfile | null> {
    const existing = await this.theologyProfile(surahId);

    if (!existing) {
      await execute(
        this.db,
        `INSERT INTO qr_surah_theology_profile
           (surah, divine_attributes, prophethood_aspects, eschatology_aspects, cosmology_aspects, note_md)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          surahId,
          data.divine_attributes ?? null,
          data.prophethood_aspects ?? null,
          data.eschatology_aspects ?? null,
          data.cosmology_aspects ?? null,
          data.note_md ?? null,
        ],
      );
    } else {
      const sets: string[] = [];
      const vals: unknown[] = [];

      if (data.divine_attributes !== undefined)    { sets.push('divine_attributes = ?');    vals.push(data.divine_attributes); }
      if (data.prophethood_aspects !== undefined)  { sets.push('prophethood_aspects = ?');  vals.push(data.prophethood_aspects); }
      if (data.eschatology_aspects !== undefined)  { sets.push('eschatology_aspects = ?');  vals.push(data.eschatology_aspects); }
      if (data.cosmology_aspects !== undefined)    { sets.push('cosmology_aspects = ?');    vals.push(data.cosmology_aspects); }
      if (data.note_md !== undefined)              { sets.push('note_md = ?');              vals.push(data.note_md); }

      if (sets.length > 0) {
        vals.push(surahId);
        await execute(this.db, `UPDATE qr_surah_theology_profile SET ${sets.join(', ')} WHERE surah = ?`, vals);
      }
    }

    return this.theologyProfile(surahId);
  }

  // ── qr_surah_worldview_profile ────────────────────────────────────────────

  worldviewProfile(surahId: number): Promise<SurahWorldviewProfile | null> {
    return queryOne<SurahWorldviewProfile>(
      this.db,
      `SELECT surah, anthropology_notes, value_architecture, moral_universe,
              divine_human_rel, worldview_tensions, note_md, created_at
       FROM qr_surah_worldview_profile
       WHERE surah = ?`,
      [surahId],
    );
  }

  async upsertWorldviewProfile(surahId: number, data: SurahWorldviewProfileUpsert): Promise<SurahWorldviewProfile | null> {
    const existing = await this.worldviewProfile(surahId);

    if (!existing) {
      await execute(
        this.db,
        `INSERT INTO qr_surah_worldview_profile
           (surah, anthropology_notes, value_architecture, moral_universe,
            divine_human_rel, worldview_tensions, note_md)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          surahId,
          data.anthropology_notes ?? null,
          data.value_architecture ?? null,
          data.moral_universe ?? null,
          data.divine_human_rel ?? null,
          data.worldview_tensions ?? null,
          data.note_md ?? null,
        ],
      );
    } else {
      const sets: string[] = [];
      const vals: unknown[] = [];

      if (data.anthropology_notes !== undefined) { sets.push('anthropology_notes = ?'); vals.push(data.anthropology_notes); }
      if (data.value_architecture !== undefined) { sets.push('value_architecture = ?'); vals.push(data.value_architecture); }
      if (data.moral_universe !== undefined)     { sets.push('moral_universe = ?');     vals.push(data.moral_universe); }
      if (data.divine_human_rel !== undefined)   { sets.push('divine_human_rel = ?');   vals.push(data.divine_human_rel); }
      if (data.worldview_tensions !== undefined) { sets.push('worldview_tensions = ?'); vals.push(data.worldview_tensions); }
      if (data.note_md !== undefined)            { sets.push('note_md = ?');            vals.push(data.note_md); }

      if (sets.length > 0) {
        vals.push(surahId);
        await execute(this.db, `UPDATE qr_surah_worldview_profile SET ${sets.join(', ')} WHERE surah = ?`, vals);
      }
    }

    return this.worldviewProfile(surahId);
  }
}
